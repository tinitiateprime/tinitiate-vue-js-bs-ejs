require('dotenv').config();

const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');
const pageRoutes = require('./routes/pageRoutes');

function createApp(options = {}) {
  const rootDir = options.rootDir || path.resolve(__dirname, '..');
  const app = express();

  app.set('views', path.join(rootDir, 'views'));
  app.set('view engine', 'ejs');
  app.disable('x-powered-by');

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());
  app.use(express.static(path.join(rootDir, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0
  }));

  app.use('/api', apiRoutes);
  app.use(pageRoutes);

  app.use((error, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }

    res.status(500).render('error', {
      message: error.message || 'Unexpected server error',
      detail: error.cause?.message || '',
      activeTheme: 'light'
    });
  });

  return app;
}

module.exports = {
  createApp
};




