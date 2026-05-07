const { getDb, admin } = require('../firebase/admin');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class FirebaseService {
  async logActivity(type, data, userId = 'system') {
    try {
      const db = getDb();
      await db.collection('activity').add({
        id: uuidv4(),
        type,
        data,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.error(`[Firebase] Log activity failed: ${err.message}`);
    }
  }

  async addNotification({ title, message, type = 'info', userId = null }) {
    try {
      const db = getDb();
      await db.collection('notifications').add({
        id: uuidv4(),
        title,
        message,
        type,
        userId,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.error(`[Firebase] Add notification failed: ${err.message}`);
    }
  }

  async saveServer(serverData) {
    try {
      const db = getDb();
      const ref = await db.collection('servers').add({
        ...serverData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return ref.id;
    } catch (err) {
      logger.error(`[Firebase] Save server failed: ${err.message}`);
      throw err;
    }
  }

  async deleteServerFromDb(pteroId) {
    try {
      const db = getDb();
      const snap = await db.collection('servers').where('pteroId', '==', pteroId).get();
      const batch = db.batch();
      snap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    } catch (err) {
      logger.error(`[Firebase] Delete server from DB failed: ${err.message}`);
    }
  }

  async saveAdmin(adminData) {
    try {
      const db = getDb();
      const ref = await db.collection('admins').add({
        ...adminData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return ref.id;
    } catch (err) {
      logger.error(`[Firebase] Save admin failed: ${err.message}`);
      throw err;
    }
  }

  async getAdmins() {
    try {
      const db = getDb();
      const snap = await db.collection('admins').orderBy('createdAt', 'desc').limit(100).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      logger.error(`[Firebase] Get admins failed: ${err.message}`);
      return [];
    }
  }

  async deleteAdmin(docId) {
    try {
      const db = getDb();
      await db.collection('admins').doc(docId).delete();
    } catch (err) {
      logger.error(`[Firebase] Delete admin failed: ${err.message}`);
      throw err;
    }
  }

  async getActivity(limit = 50) {
    try {
      const db = getDb();
      const snap = await db.collection('activity').orderBy('createdAt', 'desc').limit(limit).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() }));
    } catch (err) {
      logger.error(`[Firebase] Get activity failed: ${err.message}`);
      return [];
    }
  }

  async getNotifications(limit = 20) {
    try {
      const db = getDb();
      const snap = await db.collection('notifications').orderBy('createdAt', 'desc').limit(limit).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate?.() || new Date() }));
    } catch (err) {
      logger.error(`[Firebase] Get notifications failed: ${err.message}`);
      return [];
    }
  }

  async updateAnalytics(date, field) {
    try {
      const db = getDb();
      const ref = db.collection('analytics').doc(date);
      await ref.set({ [field]: admin.firestore.FieldValue.increment(1), date }, { merge: true });
    } catch (err) {
      logger.error(`[Firebase] Update analytics failed: ${err.message}`);
    }
  }

  async getAnalytics(days = 7) {
    try {
      const db = getDb();
      const snap = await db.collection('analytics').orderBy('date', 'desc').limit(days).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      logger.error(`[Firebase] Get analytics failed: ${err.message}`);
      return [];
    }
  }

  async logLogin(username, ip, success) {
    try {
      const db = getDb();
      await db.collection('logs').add({
        type: 'login',
        username,
        ip,
        success,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (err) {
      logger.error(`[Firebase] Log login failed: ${err.message}`);
    }
  }
}

module.exports = new FirebaseService();
