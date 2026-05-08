const path = require('path');
const serverless = require('serverless-http');
const { createApp } = require('../../src/app');

module.exports.handler = serverless(createApp({
  rootDir: path.resolve(__dirname, '../..')
}));
