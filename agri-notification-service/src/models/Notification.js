'use strict';

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  type: { type: String, enum: ['alerte', 'info', 'succes'], default: 'info' },
  message: { type: String, required: true },
  parcelleId: { type: Number, default: null },
  lu: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
