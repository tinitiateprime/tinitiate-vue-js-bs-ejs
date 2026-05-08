const express = require('express');
const { renderPage } = require('../controllers/pageController');

const router = express.Router();

router.get('*', renderPage);

module.exports = router;
