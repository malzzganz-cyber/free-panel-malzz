const pterodactyl = require('../services/pterodactyl');
const firebaseService = require('../services/firebase.service');
const logger = require('../utils/logger');

async function createAdmin(req, res) {
  try {
    const { username, email, firstName, lastName } = req.body;
    if (!username || !email) {
      return res.status(400).json({ success: false, message: 'Username and email required' });
    }

    const pteroUser = await pterodactyl.createUser({ username, email, firstName, lastName });

    const docId = await firebaseService.saveAdmin({
      pteroId: pteroUser.id,
      username,
      email,
      firstName: firstName || 'Malzz',
      lastName: lastName || 'Admin',
      role: 'admin',
    });

    await firebaseService.logActivity('admin_created', { username, email }, req.user?.username);
    await firebaseService.addNotification({
      title: '👤 Admin Created',
      message: `Admin account "${username}" has been created`,
      type: 'info',
    });

    logger.info(`[Admins] Created admin: ${username}`);
    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: { ...pteroUser, docId },
    });
  } catch (err) {
    logger.error(`[Admins] Create error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function getAdmins(req, res) {
  try {
    const admins = await firebaseService.getAdmins();
    res.json({ success: true, data: admins });
  } catch (err) {
    logger.error(`[Admins] Get error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

async function deleteAdmin(req, res) {
  try {
    const { id } = req.params;
    const admins = await firebaseService.getAdmins();
    const admin = admins.find(a => a.id === id);

    if (admin?.pteroId) {
      await pterodactyl.deleteUser(admin.pteroId);
    }

    await firebaseService.deleteAdmin(id);
    await firebaseService.logActivity('admin_deleted', { adminId: id }, req.user?.username);

    res.json({ success: true, message: 'Admin deleted successfully' });
  } catch (err) {
    logger.error(`[Admins] Delete error: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = { createAdmin, getAdmins, deleteAdmin };
