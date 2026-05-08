const serverless = require('serverless-http');
const { createApp } = require('../../src/app');

module.exports.handler = serverless(createApp());
