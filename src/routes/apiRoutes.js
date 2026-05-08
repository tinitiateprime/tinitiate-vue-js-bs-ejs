const express = require('express');
const {
  getContent,
  handleContact,
  handleLogin,
  handleSignup,
  quoteCart
} = require('../controllers/apiController');

const router = express.Router();

router.get('/content', getContent);
router.post('/forms/contact', handleContact);
router.post('/auth/login', handleLogin);
router.post('/auth/signup', handleSignup);
router.post('/cart/quote', quoteCart);

module.exports = router;
