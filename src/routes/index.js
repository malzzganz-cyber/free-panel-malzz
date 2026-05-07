const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const authCtrl = require('../controllers/auth.controller');
const serversCtrl = require('../controllers/servers.controller');
const adminsCtrl = require('../controllers/admins.controller');
const analyticsCtrl = require('../controllers/analytics.controller');

// Auth routes
router.post('/auth/login', authCtrl.login);
router.post('/auth/logout', authMiddleware, authCtrl.logout);
router.get('/auth/me', authMiddleware, authCtrl.me);

// Server routes
router.post('/servers/create', authMiddleware, serversCtrl.createServer);
router.get('/servers', authMiddleware, serversCtrl.getServers);
router.delete('/servers/:id', authMiddleware, serversCtrl.deleteServer);
router.get('/servers/status', authMiddleware, serversCtrl.getServerStatus);

// Admin routes
router.post('/admins/create', authMiddleware, adminsCtrl.createAdmin);
router.get('/admins', authMiddleware, adminsCtrl.getAdmins);
router.delete('/admins/:id', authMiddleware, adminsCtrl.deleteAdmin);

// Bulk routes
router.post('/bulk/delete-users', authMiddleware, analyticsCtrl.bulkDeleteUsers);
router.post('/bulk/delete-servers', authMiddleware, analyticsCtrl.bulkDeleteServers);

// Analytics
router.get('/analytics', authMiddleware, analyticsCtrl.getAnalytics);

// Notifications
router.get('/notifications', authMiddleware, analyticsCtrl.getNotifications);

// Activity
router.get('/activity', authMiddleware, analyticsCtrl.getActivity);

module.exports = router;
