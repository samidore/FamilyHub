/** Compiles real UI modules for component tests with controlled external services. */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

export async function compileUiModules(entry, source) {
  const modules = {};
  async function visit(filename, override) {
    if (modules[filename]) return;
    const input = override ?? await readFile(filename, 'utf8');
    const output = ts.transpileModule(input.replaceAll('import.meta.env.BASE_URL', "'/'").replaceAll('import.meta.env?.DEV', 'false').replaceAll('import.meta.env.DEV', 'false'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    }).outputText;
    modules[filename] = { code: output, imports: {} };
    for (const [, specifier] of output.matchAll(/require\("([^"]+)"\)/g)) {
      if (!specifier.startsWith('.')) continue;
      const dependency = path.posix.normalize(path.posix.join(path.posix.dirname(filename), specifier));
      modules[filename].imports[specifier] = dependency;
      await visit(dependency);
    }
  }
  await visit(entry, source);
  return { entry, modules };
}

export function loadUiModule(bundle, mocks) {
  const cache = {};
  function load(id) {
    if (id in mocks) return mocks[id];
    if (cache[id]) return cache[id];
    const module = bundle.modules[id];
    if (!module) throw new Error(`Missing test dependency: ${id}`);
    const exports = cache[id] = {};
    new Function('require', 'exports', module.code)((specifier) => load(module.imports[specifier] ?? specifier), exports);
    return exports;
  }
  return load(bundle.entry);
}
