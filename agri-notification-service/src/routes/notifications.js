'use strict';

const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const auth = require('../middleware/auth');

// POST /notifications - create a notification
router.post('/', auth, async (req, res) => {
  try {
    const { type, message, parcelleId } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    const notification = new Notification({
      userId: req.user.userId,
      type: type || 'info',
      message,
      parcelleId: parcelleId !== undefined ? parcelleId : null
    });
    await notification.save();
    return res.status(201).json(notification);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /notifications - list all notifications for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.userId })
      .sort({ createdAt: -1 });
    return res.json(notifications);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /notifications/:id/lu - mark notification as read
router.patch('/:id/lu', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { lu: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.json(notification);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /notifications/:id - delete a notification (only if userId matches)
router.delete('/:id', auth, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.userId
    });
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    return res.json({ message: 'Notification deleted' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
