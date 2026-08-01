import { defineConfig } from 'astro/config';

const [owner, repository] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const onGitHubPages = process.env.GITHUB_ACTIONS === 'true' && owner && repository;
const projectSite = repository && !repository.endsWith('.github.io');

export default defineConfig({
  site: onGitHubPages ? `https://${owner}.github.io` : 'http://localhost:4321',
  base: onGitHubPages && projectSite ? `/${repository}` : '/',
  output: 'static',
});
