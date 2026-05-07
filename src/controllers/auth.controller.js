const jwt = require('jsonwebtoken');
const firebaseService = require('../services/firebase.service');
const logger = require('../utils/logger');

async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const validUser = username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
    if (!validUser) {
      await firebaseService.logLogin(username, req.ip, false);
      logger.warn(`[Auth] Failed login attempt: ${username} from ${req.ip}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username, email: process.env.ADMIN_EMAIL, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await firebaseService.logLogin(username, req.ip, true);
    await firebaseService.logActivity('login', { username, ip: req.ip });

    logger.info(`[Auth] Login success: ${username} from ${req.ip}`);
    res.json({ success: true, token, user: { username, email: process.env.ADMIN_EMAIL, role: 'admin' } });
  } catch (err) {
    logger.error(`[Auth] Login error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

async function logout(req, res) {
  await firebaseService.logActivity('logout', { username: req.user?.username });
  res.json({ success: true, message: 'Logged out successfully' });
}

function me(req, res) {
  res.json({ success: true, user: req.user });
}

module.exports = { login, logout, me };
