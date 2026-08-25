const express = require('express');
const router = express.Router();

const { authenticateUser } = require('../middlewares/auth');
const { apiLimiter, authLimiter, messagePostLimiter } = require('../middlewares/rateLimiter');
const upload = require('../middlewares/upload');

const authController = require('../controllers/authController');
const conversationController = require('../controllers/conversationController');
const messageController = require('../controllers/messageController');
const uploadController = require('../controllers/uploadController');
const economyController = require('../controllers/economyController');
const walletController = require('../controllers/walletController');
const adminController = require('../controllers/adminController');

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

// --- Wallet Routes ---
router.get('/wallet', authenticateUser, walletController.getWalletDetails);
router.post('/wallet/transfer', authenticateUser, walletController.transferCoins);

// --- Admin Routes (Damon / Role Admin) ---
router.get('/admin/stats', authenticateUser, adminController.requireAdmin, adminController.getAdminStats);
router.get('/admin/users', authenticateUser, adminController.requireAdmin, adminController.getAdminUsers);
router.post('/admin/give-coins', authenticateUser, adminController.requireAdmin, adminController.giveCoinsToUser);
router.post('/admin/ban-user', authenticateUser, adminController.requireAdmin, adminController.toggleBanUser);
router.post('/admin/broadcast', authenticateUser, adminController.requireAdmin, adminController.broadcastAnnouncement);

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
