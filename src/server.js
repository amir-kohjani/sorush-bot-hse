const Fastify = require("fastify");
require('dotenv').config();
const config = require('../utils/config');
const logger = require("../utils/logger");
const Bot = require('./bot')

async function buildServer() {
    const fastify = Fastify({
        logger: {
            transport: {
                target: "pino-pretty",
                options: {
                    colorize: true,
                    translateTime: "HH:MM:ss.l",
                    ignore: "pid,hostname",
                },
            },
        },
        requestIdLogLabel: "reqId",
        disableRequestLogging: true,
        trustProxy: true,
    });

    // ثبت پلاگین دیتابیس
    await fastify.register(require("./plugins/database"), config.database);

    // ثبت روت‌های API
    fastify.register(require('./routes/api'), { prefix: '/api' });

    // راه‌اندازی ربات تلگرام (سروش پلاس)

    // شروع سرور

    return fastify
}

let server;
const start = async () => {
    try {
        server = await buildServer()

        await server.listen({
            port: config.HSEBot.port,
            host: config.HSEBot.host,
        });

        const bot = new Bot(server)

        // اجرای ربات به صورت polling در پس‌زمینه
        // (اگر webhook می‌خواهید، این خط را حذف کنید)
        bot.startBotPolling(server);
        logger.info(
            `HSE-BOT Server Listening On ${config.HSEBot.host}:${config.HSEBot.port}`,
        );
    } catch (err) {
        console.log("🚀 ~ start ~ err:", err)
        logger.fatal(err);
        process.exit(1);
    }
};

// // Graceful Shutdown
const closeGracefully = async (signal) => {
    logger.info(`Received ${signal}, closing server...`);
    await server.close();
    logger.info('Server closed.');
    process.exit(0);
};

process.on('SIGINT', () => closeGracefully('SIGINT'));
process.on('SIGTERM', () => closeGracefully('SIGTERM'));

start();