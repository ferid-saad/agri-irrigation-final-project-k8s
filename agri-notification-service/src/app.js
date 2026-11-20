'use strict';

const express = require('express');
const notificationsRouter = require('./routes/notifications');

const app = express();

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service' });
});

// Routes
app.use('/notifications', notificationsRouter);

module.exports = app;
