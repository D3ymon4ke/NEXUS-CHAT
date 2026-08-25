const express = require('express');
const router = express.Router();

const { authenticateUser } = require('../middlewares/auth');
const { apiLimiter, authLimiter, messagePostLimiter } = require('../middlewares/rateLimiter');
const upload = require('../middlewares/upload');

const authController = require('../controllers/authController');
const conversationController = require('../controllers/conversationController');
const messageController = require('../controllers/messageController');
const userController = require('../controllers/userController');
const uploadController = require('../controllers/uploadController');
const economyController = require('../controllers/economyController');

// --- Health Check ---
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// --- Auth Routes ---
router.get('/auth/me', authenticateUser, authController.getMe);
router.post('/auth/reset-password', authLimiter, authController.resetPassword);

// --- User Routes ---
router.get('/users/search', authenticateUser, userController.searchUsers);
router.put('/users/profile', authenticateUser, userController.updateProfile);
router.put('/users/settings', authenticateUser, userController.updateSettings);

// --- Economy & Nexus Shop Routes ---
router.get('/economy/shop', authenticateUser, economyController.getShopCatalog);
router.post('/economy/claim-daily', authenticateUser, economyController.claimDailyReward);
router.post('/economy/buy', authenticateUser, economyController.buyShopItem);
router.post('/economy/equip', authenticateUser, economyController.equipShopItem);

// --- Conversation Routes ---
router.get('/conversations', authenticateUser, conversationController.getUserConversations);
router.post('/conversations/direct', authenticateUser, conversationController.getOrCreateDirectConversation);
router.post('/conversations/group', authenticateUser, conversationController.createGroupConversation);

// --- Message Routes ---
router.get('/conversations/:conversationId/messages', authenticateUser, messageController.getConversationMessages);
router.get('/conversations/:conversationId/messages/search', authenticateUser, messageController.searchMessages);
router.get('/conversations/:conversationId/messages/pinned', authenticateUser, messageController.getPinnedMessages);

// --- Upload Route ---
router.post('/upload', authenticateUser, upload.single('file'), uploadController.uploadFile);

module.exports = router;
