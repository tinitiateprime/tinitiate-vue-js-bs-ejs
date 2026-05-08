const DEFAULT_OWNER = 'tinitiateprime';
const DEFAULT_REPO = 'tech-stack-data.json';
const DEFAULT_BRANCH = 'master';

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getGithubConfig() {
  return {
    owner: process.env.GITHUB_OWNER || DEFAULT_OWNER,
    repo: process.env.GITHUB_REPO || DEFAULT_REPO,
    branch: process.env.GITHUB_BRANCH || DEFAULT_BRANCH,
    dataPath: process.env.GITHUB_DATA_PATH || 'data.json',
    themePath: process.env.GITHUB_THEME_PATH || 'theme.json',
    token: process.env.GITHUB_TOKEN || '',
    cacheTtlMs: numberFromEnv('CONTENT_CACHE_TTL_MS', 60_000)
  };
}

function buildRawUrl(config, filePath) {
  const cleanPath = String(filePath || '').replace(/^\/+/, '');
  const segments = cleanPath.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/${encodeURIComponent(config.branch)}/${segments}`;
}

module.exports = {
  getGithubConfig,
  buildRawUrl
};
