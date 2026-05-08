const { getSitePayload } = require('../services/githubContentService');
const { resolvePage } = require('../services/pageService');

function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

async function renderPage(req, res, next) {
  try {
    const payload = await getSitePayload();
    const page = resolvePage(req.path, payload.site);
    const activeTheme = req.query.theme === 'dark' ? 'dark' : 'light';

    res.status(page.notFound ? 404 : 200).render('shell', {
      ...payload,
      ...page,
      activeTheme,
      jsonForScript
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  renderPage
};
