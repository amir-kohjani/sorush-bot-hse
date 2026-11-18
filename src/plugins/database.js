
const fp = require('fastify-plugin');
const DatabasePool = require('../../utils/pool');

async function databasePlugin(fastify, options) {
  const pool = new DatabasePool();
  
  // تست اتصال
  try {
    const connected = await pool.testConnection();
    if (!connected) {
      throw new Error('Database connection test failed');
    }
    fastify.log.info('Database connected');
  } catch (err) {
    fastify.log.fatal({ err }, 'Database connection failed');
    throw err;
  }

  // Decorate Fastify instance
  fastify.decorate('db', pool);

  // Graceful shutdown
  fastify.addHook('onClose', async () => {
    await pool.end();
    fastify.log.info('Database pool closed');
  });
}

module.exports = fp(databasePlugin, {
  name: 'database',
});