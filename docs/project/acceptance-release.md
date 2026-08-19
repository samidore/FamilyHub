# Acceptance and release

## Verification

Use the checks available and relevant to the change while developing.

The complete repository verification gate is:

```bash
pnpm run verify
```

`package.json` defines what this gate includes.

A change may be implementation-complete even when the current environment cannot run the full gate. In that case, verify everything available in the current environment and report the unrun checks explicitly.

Firebase rules tests require Java. Playwright Chromium must be installed on a new local environment.

Before release, the full verification gate must pass.

## Acceptance

A change is implementation-complete when:

- the requested change is implemented;
- affected references, schemas, and static invariants that can be checked in the current environment are valid;
- relevant module-specific requirements are satisfied;
- any verification that could not be run is identified explicitly.

A release is complete only after `pnpm run verify` passes.

New modules must have registry metadata, validated structured data, a working route/presentation, and appropriate acceptance coverage before entering navigation.

## Release

Deploy only after the full verification gate passes.

Set source verification dates only when the underlying source was actually checked; a file or content update is not source verification.
