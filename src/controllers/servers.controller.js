const pterodactyl = require('../services/pterodactyl');
const firebaseService = require('../services/firebase.service');
const logger = require('../utils/logger');

async function createServer(req, res) {
  try {
    const { username, email, ram, disk, cpu, telegramId, serverName, databases, backups } = req.body;
    if (!username || !email || !ram || !disk || !cpu) {
      return res.status(400).json({ success: false, message: 'Missing required fields: username, email, ram, disk, cpu' });
    }

    // Create user on Pterodactyl
    const pteroUser = await pterodactyl.createUser({ username, email });

    // Create server on Pterodactyl
    const name = serverName || `${username}-server`;
    const pteroServer = await pterodactyl.createServer({
      userId: pteroUser.id,
      name,
      ram,
      disk,
      cpu,
      databases: databases || 1,
      backups: backups || 1,
    });

    const today = new Date().toISOString().split('T')[0];

    // Save to Firebase
    await firebaseService.saveServer({
      pteroId: pteroServer.id,
      uuid: pteroServer.uuid,
      name: pteroServer.name,
      username,
      email,
      telegramId: telegramId || null,
      ram,
      disk,
      cpu,
      status: 'running',
      pteroUserId: pteroUser.id,
    });

    await firebaseService.updateAnalytics(today, 'serversCreated');
    await firebaseService.logActivity('server_created', { name, username, email, ram, disk, cpu }, req.user?.username);
    await firebaseService.addNotification({
      title: '✅ Server Created',
      message: `Server "${name}" for ${username} has been created successfully`,
      type: 'success',
    });

    logger.info(`[Servers] Created server ${name} for ${username}`);
    res.status(201).json({
      success: true,
      message: 'Server and user created successfully',
      data: { server: pteroServer, user: pteroUser },
    });
  } catch (err) {
    logger.error(`[Servers] Create error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getServers(req, res) {
  try {
    const { page = 1 } = req.query;
    const data = await pterodactyl.getAllServers(parseInt(page));
    res.json({ success: true, data });
  } catch (err) {
    logger.error(`[Servers] Get error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteServer(req, res) {
  try {
    const { id } = req.params;
    await pterodactyl.deleteServer(id);
    await firebaseService.deleteServerFromDb(parseInt(id));
    await firebaseService.logActivity('server_deleted', { serverId: id }, req.user?.username);
    await firebaseService.addNotification({
      title: '🗑️ Server Deleted',
      message: `Server ID ${id} has been deleted`,
      type: 'warning',
    });
    res.json({ success: true, message: 'Server deleted successfully' });
  } catch (err) {
    logger.error(`[Servers] Delete error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getServerStatus(req, res) {
  try {
    const data = await pterodactyl.getAllServers();
    const servers = data.data || [];
    const total = servers.length;
    const online = servers.filter(s => s.attributes?.status === 'running').length;

    res.json({
      success: true,
      data: {
        total,
        online,
        offline: total - online,
        servers: servers.slice(0, 10).map(s => ({
          id: s.attributes?.id,
          uuid: s.attributes?.uuid,
          name: s.attributes?.name,
          status: s.attributes?.status || 'offline',
          node: s.attributes?.node,
          ram: s.attributes?.limits?.memory,
          disk: s.attributes?.limits?.disk,
          cpu: s.attributes?.limits?.cpu,
        })),
      },
    });
  } catch (err) {
    logger.error(`[Servers] Status error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { createServer, getServers, deleteServer, getServerStatus };
