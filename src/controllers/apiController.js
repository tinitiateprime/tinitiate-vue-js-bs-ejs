const { getSitePayload } = require('../services/githubContentService');

async function getContent(req, res, next) {
  try {
    const payload = await getSitePayload({ force: req.query.refresh === '1' });
    res.json(payload);
  } catch (error) {
    next(error);
  }
}

async function handleContact(req, res) {
  res.json({
    ok: true,
    type: 'contact',
    receivedAt: new Date().toISOString(),
    fields: Object.keys(req.body || {})
  });
}

async function handleLogin(req, res) {
  res.json({
    ok: true,
    type: 'login',
    receivedAt: new Date().toISOString(),
    user: req.body?.email || null
  });
}

async function handleSignup(req, res) {
  res.json({
    ok: true,
    type: 'signup',
    receivedAt: new Date().toISOString(),
    user: req.body?.email || null
  });
}

async function quoteCart(req, res, next) {
  try {
    const payload = await getSitePayload();
    const quantities = req.body?.quantities || {};
    const items = payload.site.catalog?.items || [];
    const quotedItems = items
      .map((item) => {
        const quantity = Number(quantities[item.id] || 0);
        const price = Number(item.price || 0);
        return {
          id: item.id,
          name: item.name,
          quantity,
          price,
          total: price * quantity,
          currency: item.currency || ''
        };
      })
      .filter((item) => item.quantity > 0);

    res.json({
      ok: true,
      items: quotedItems,
      total: quotedItems.reduce((sum, item) => sum + item.total, 0)
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getContent,
  handleContact,
  handleLogin,
  handleSignup,
  quoteCart
};
