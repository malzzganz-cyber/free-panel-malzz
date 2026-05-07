const firebaseService = require('../services/firebase.service');
const pterodactyl = require('../services/pterodactyl');
const logger = require('../utils/logger');

async function getAnalytics(req, res) {
  try {
    const [analyticsData, serversData] = await Promise.all([
      firebaseService.getAnalytics(30),
      pterodactyl.getAllServers().catch(() => ({ data: [] })),
    ]);

    const servers = serversData.data || [];
    const totalServers = servers.length;
    const admins = await firebaseService.getAdmins();

    const chartData = analyticsData.reverse().map(d => ({
      date: d.date,
      serversCreated: d.serversCreated || 0,
      logins: d.logins || 0,
    }));

    res.json({
      success: true,
      data: {
        overview: {
          totalServers,
          totalAdmins: admins.length,
          serversOnline: servers.filter(s => s.attributes?.status === 'running').length,
          uptime: '99.9%',
        },
        chart: chartData,
      },
    });
  } catch (err) {
    logger.error(`[Analytics] Error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getNotifications(req, res) {
  try {
    const notifications = await firebaseService.getNotifications(30);
    res.json({ success: true, data: notifications });
  } catch (err) {
    logger.error(`[Notifications] Error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getActivity(req, res) {
  try {
    const { limit = 50 } = req.query;
    const activity = await firebaseService.getActivity(parseInt(limit));
    res.json({ success: true, data: activity });
  } catch (err) {
    logger.error(`[Activity] Error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function bulkDeleteUsers(req, res) {
  try {
    const { userIds } = req.body;
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'userIds array required' });
    }
    const results = await Promise.allSettled(userIds.map(id => pterodactyl.deleteUser(id)));
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    await firebaseService.logActivity('bulk_delete_users', { count: succeeded }, req.user?.username);
    res.json({ success: true, message: `Deleted ${succeeded}/${userIds.length} users` });
  } catch (err) {
    logger.error(`[Bulk] Delete users error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function bulkDeleteServers(req, res) {
  try {
    const { serverIds } = req.body;
    if (!Array.isArray(serverIds) || serverIds.length === 0) {
      return res.status(400).json({ success: false, message: 'serverIds array required' });
    }
    const results = await Promise.allSettled(serverIds.map(id => pterodactyl.deleteServer(id)));
    const succeeded = results.filter(r => r.status === 'fulfilled').length;
    await firebaseService.logActivity('bulk_delete_servers', { count: succeeded }, req.user?.username);
    res.json({ success: true, message: `Deleted ${succeeded}/${serverIds.length} servers` });
  } catch (err) {
    logger.error(`[Bulk] Delete servers error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { getAnalytics, getNotifications, getActivity, bulkDeleteUsers, bulkDeleteServers };
