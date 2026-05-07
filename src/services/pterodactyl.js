const axios = require('axios');
const logger = require('../utils/logger');

class PterodactylService {
  constructor() {
    this.domain = process.env.PTERO_DOMAIN;
    this.appApi = axios.create({
      baseURL: `${this.domain}/api/application`,
      headers: {
        Authorization: `Bearer ${process.env.PTERO_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15000,
    });
    this.clientApi = axios.create({
      baseURL: `${this.domain}/api/client`,
      headers: {
        Authorization: `Bearer ${process.env.PTERO_CLIENT_API}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15000,
    });
  }

  async createUser({ username, email, firstName = 'Malzz', lastName = 'User', password }) {
    try {
      const res = await this.appApi.post('/users', {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        password: password || this._generatePassword(),
      });
      logger.info(`[Pterodactyl] User created: ${username}`);
      return res.data.attributes;
    } catch (err) {
      logger.error(`[Pterodactyl] Create user failed: ${err.response?.data?.errors?.[0]?.detail || err.message}`);
      throw new Error(err.response?.data?.errors?.[0]?.detail || 'Failed to create Pterodactyl user');
    }
  }

  async createServer({ userId, name, ram, disk, cpu, databases = 1, backups = 1 }) {
    try {
      const res = await this.appApi.post('/servers', {
        name,
        user: userId,
        egg: parseInt(process.env.PTERO_EGG_ID || 15),
        docker_image: 'ghcr.io/pterodactyl/yolks:java_17',
        startup: 'java -Xms128M -XX:MaxRAMPercentage=95.0 -jar {{SERVER_JARFILE}}',
        environment: {
          SERVER_JARFILE: 'server.jar',
          BUILD_NUMBER: 'latest',
          VANILLA_VERSION: 'latest',
        },
        limits: {
          memory: parseInt(ram),
          swap: 0,
          disk: parseInt(disk),
          io: 500,
          cpu: parseInt(cpu),
        },
        feature_limits: {
          databases: parseInt(databases),
          backups: parseInt(backups),
          allocations: 1,
        },
        allocation: {
          default: parseInt(process.env.PTERO_ALLOCATION_ID || 1),
        },
        deploy: {
          locations: [parseInt(process.env.PTERO_LOCATION_ID || 1)],
          dedicated_ip: false,
          port_range: [],
        },
      });
      logger.info(`[Pterodactyl] Server created: ${name}`);
      return res.data.attributes;
    } catch (err) {
      logger.error(`[Pterodactyl] Create server failed: ${err.response?.data?.errors?.[0]?.detail || err.message}`);
      throw new Error(err.response?.data?.errors?.[0]?.detail || 'Failed to create server');
    }
  }

  async getAllServers(page = 1) {
    try {
      const res = await this.appApi.get(`/servers?page=${page}&per_page=50`);
      return res.data;
    } catch (err) {
      logger.error(`[Pterodactyl] Get servers failed: ${err.message}`);
      throw new Error('Failed to fetch servers');
    }
  }

  async deleteServer(serverId) {
    try {
      await this.appApi.delete(`/servers/${serverId}`);
      logger.info(`[Pterodactyl] Server deleted: ${serverId}`);
      return true;
    } catch (err) {
      logger.error(`[Pterodactyl] Delete server failed: ${err.message}`);
      throw new Error('Failed to delete server');
    }
  }

  async getAllUsers(page = 1) {
    try {
      const res = await this.appApi.get(`/users?page=${page}&per_page=50`);
      return res.data;
    } catch (err) {
      logger.error(`[Pterodactyl] Get users failed: ${err.message}`);
      throw new Error('Failed to fetch users');
    }
  }

  async deleteUser(userId) {
    try {
      await this.appApi.delete(`/users/${userId}`);
      logger.info(`[Pterodactyl] User deleted: ${userId}`);
      return true;
    } catch (err) {
      logger.error(`[Pterodactyl] Delete user failed: ${err.message}`);
      throw new Error('Failed to delete user');
    }
  }

  async getServerResources(serverUuid) {
    try {
      const res = await this.clientApi.get(`/servers/${serverUuid}/resources`);
      return res.data.attributes;
    } catch (err) {
      logger.error(`[Pterodactyl] Get resources failed: ${err.message}`);
      return null;
    }
  }

  async getNodes() {
    try {
      const res = await this.appApi.get('/nodes');
      return res.data;
    } catch (err) {
      logger.error(`[Pterodactyl] Get nodes failed: ${err.message}`);
      throw new Error('Failed to fetch nodes');
    }
  }

  _generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$!';
    return Array.from({ length: 16 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}

module.exports = new PterodactylService();
