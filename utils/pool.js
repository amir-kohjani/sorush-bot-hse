const { Pool } = require('pg');
const config = require('./config');
const logger = require('./logger');

class DatabasePool {
  constructor() {
    // Primary pool (برای نوشتن)
    this.writePool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
      max: config.database.poolSize,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      statement_timeout: 30000
    });

    // Read pools (برای خواندن از Replica ها)
    this.readPools = config.database.replicas.map(replica =>
      new Pool({
        host: replica.host,
        port: config.database.port,
        database: config.database.database,
        user: config.database.user,
        password: config.database.password,
        max: Math.ceil(config.database.poolSize * 1.5), // بیشتر برای Read
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: 30000
      })
    );

    this.currentReplicaIndex = 0;

    // Event handlers
    this.writePool.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on write pool');
    });

    this.writePool.on('connect', () => {
      logger.debug('New client connected to write pool');
    });

    this.writePool.on('remove', () => {
      logger.debug('Client removed from write pool');
    });
  }

  // نوشتن (فقط روی Primary)
  async write(query, params) {
    return this.writePool.query(query, params);
  }

  // خواندن (از Replicas با Round-robin)
  async read(query, params) {
    if (this.readPools.length === 0) {
      // اگه Replica نداریم، از Primary بخون
      return this.writePool.query(query, params);
    }

    const pool = this.readPools[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.readPools.length;
    return pool.query(query, params);
  }

  // دریافت Connection از Write Pool
  async getWriteClient() {
    return this.writePool.connect();
  }

  // دریافت Connection از Read Pool
  async getReadClient() {
    if (this.readPools.length === 0) {
      return this.writePool.connect();
    }

    const pool = this.readPools[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.readPools.length;
    return pool.connect();
  }
  async transaction(callback) {

    const client = await this.getWriteClient();

    try {

      await client.query('BEGIN');

      const result = await callback(client);

      await client.query('COMMIT');

      return result;

    } catch (error) {

      await client.query('ROLLBACK');

      throw error;

    } finally {

      client.release();

    }
  }
  // بستن همه Connection ها
  async end() {
    await this.writePool.end();
    await Promise.all(this.readPools.map(pool => pool.end()));
    logger.info('All database pools closed');
  }

  // تست اتصال
  async testConnection() {
    try {
      await this.writePool.query('SELECT NOW()');
      logger.info('Database connection test successful');
      return true;
    } catch (err) {
      logger.error({ err }, 'Database connection test failed');
      return false;
    }
  }
}

module.exports = DatabasePool;
