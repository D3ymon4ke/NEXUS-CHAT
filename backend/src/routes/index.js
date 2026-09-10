const express = require('express');
const router = express.Router();

const { authenticateUser } = require('../middlewares/auth');
const { apiLimiter, authLimiter, messagePostLimiter } = require('../middlewares/rateLimiter');
const upload = require('../middlewares/upload');

const authController = require('../controllers/authController');
const userController = require('../controllers/userController');
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
router.delete('/conversations/:conversationId', authenticateUser, conversationController.deleteConversation);
router.delete('/conversations/:conversationId/messages', authenticateUser, conversationController.clearConversationMessages);

// --- Message Routes ---
router.get('/conversations/:conversationId/messages', authenticateUser, messageController.getConversationMessages);
router.get('/conversations/:conversationId/messages/search', authenticateUser, messageController.searchMessages);
router.get('/conversations/:conversationId/messages/pinned', authenticateUser, messageController.getPinnedMessages);

// --- Upload Route ---
router.post('/upload', authenticateUser, upload.single('file'), uploadController.uploadFile);

// --- Link Preview Scraper (Sem Erro de CORS) ---
router.get('/link-preview', async (req, res) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ success: false, error: 'URL inválida.' });
  }

  try {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NexusChatBot/1.0; +https://nexus.chat)'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      return res.json({ success: false, error: `Status ${response.status}` });
    }

    const html = await response.text();
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']twitter:title["']\s+content=["'](.*?)["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i);

    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']twitter:description["']\s+content=["'](.*?)["']/i);

    const imgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i) ||
      html.match(/<meta\s+name=["']twitter:image["']\s+content=["'](.*?)["']/i);

    const siteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["'](.*?)["']/i);

    return res.json({
      success: true,
      data: {
        url: targetUrl,
        title: titleMatch ? titleMatch[1].trim() : '',
        description: descMatch ? descMatch[1].trim() : '',
        image: imgMatch ? imgMatch[1].trim() : '',
        siteName: siteMatch ? siteMatch[1].trim() : new URL(targetUrl).hostname
      }
    });
  } catch (err) {
    return res.json({ success: false, error: err.message });
  }
});

module.exports = router;

