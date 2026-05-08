const { buildRawUrl, getGithubConfig } = require('../config/github');
const { buildCssVariables } = require('./themeService');
const {
  buildComponentCatalog,
  buildDashboard,
  buildPageTree
} = require('./pageService');

let cache = {
  expiresAt: 0,
  payload: null,
  inflight: null
};

class ContentFetchError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ContentFetchError';
    this.cause = cause;
  }
}

async function fetchJson(url, config) {
  const headers = {
    Accept: 'application/json',
    'User-Agent': 'github-ejs-vue-template-engine'
  };

  if (config.token) {
    headers.Authorization = `Bearer ${config.token}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`GitHub returned ${response.status} for ${url}`);
  }

  return response.json();
}

function buildPayload(site, theme, config) {
  return {
    site,
    theme,
    cssVariables: buildCssVariables(theme),
    componentCatalog: buildComponentCatalog(site),
    pageTree: buildPageTree(site),
    dashboard: buildDashboard(site),
    source: {
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      dataPath: config.dataPath,
      themePath: config.themePath,
      dataUrl: buildRawUrl(config, config.dataPath),
      themeUrl: buildRawUrl(config, config.themePath)
    },
    fetchedAt: new Date().toISOString()
  };
}

async function loadFreshPayload() {
  const config = getGithubConfig();
  const [site, theme] = await Promise.all([
    fetchJson(buildRawUrl(config, config.dataPath), config),
    fetchJson(buildRawUrl(config, config.themePath), config)
  ]);

  return buildPayload(site, theme, config);
}

async function getSitePayload(options = {}) {
  const now = Date.now();
  const force = Boolean(options.force);

  if (!force && cache.payload && cache.expiresAt > now) {
    return cache.payload;
  }

  if (!cache.inflight) {
    cache.inflight = loadFreshPayload()
      .then((payload) => {
        const config = getGithubConfig();
        cache.payload = payload;
        cache.expiresAt = Date.now() + config.cacheTtlMs;
        return payload;
      })
      .catch((error) => {
        if (cache.payload) {
          return {
            ...cache.payload,
            stale: true,
            fetchError: error.message
          };
        }

        throw new ContentFetchError('Unable to fetch runtime content from GitHub.', error);
      })
      .finally(() => {
        cache.inflight = null;
      });
  }

  return cache.inflight;
}

module.exports = {
  ContentFetchError,
  getSitePayload
};
