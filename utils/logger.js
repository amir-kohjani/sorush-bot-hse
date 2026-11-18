const pino = require('pino');
const config = require('./config');

const logger = pino({
  level: config.logging.level || 'info',
    transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss.l",
          ignore: "pid,hostname",
        },
        
      },
});

module.exports = logger;
