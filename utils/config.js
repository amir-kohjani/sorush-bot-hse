function num(envKey, fallback) {
    const v = process.env[envKey];
    return v !== undefined ? Number(v) : fallback;
}

module.exports = {
    // تنظیمات محیط
    env: process.env.NODE_ENV || "development",
    TestBotToken: process.env.TEST_BOT_TOKEN || "70331852:owuqizEbt3BCkwEaJJMQzjKL1U6WuIxZR3w",
    HSEBotToken: process.env.HSE_BOT_TOKEN || "70102046:M4o0zpSZC6QlApYC6P1l5qTQ7DSekaWuBDM",
    // تنظیمات پایگاه داده
    database: {
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "5432"),
        database: process.env.DB_NAME || "hse_bot",
        user: process.env.DB_USER || "postgres",
        password: process.env.DB_PASSWORD || "123qwe!@#",
        poolSize: parseInt(process.env.DB_POOL_SIZE || "20"),

        // تنظیمات Replica ها (برای Read)
        replicas: process.env.DB_REPLICAS
            ? process.env.DB_REPLICAS.split(",").map((host) => ({ host }))
            : [],
    },

    // تنظیمات Redis
    redis: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD || null,
        db: parseInt(process.env.REDIS_DB || "0"),
        keyPrefix: "gps:",
        retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
        },
    },

    // تنظیمات API
    HSEBot: {
        host: process.env.API_HOST || "0.0.0.0",
        port: parseInt(process.env.API_PORT || "3004"),
        bodyLimit: parseInt(process.env.API_BODY_LIMIT || "1048576"), // 1MB
        requestTimeout: parseInt(process.env.API_REQUEST_TIMEOUT || "30000"), // 30s
    },

    // تنظیمات JWT
    jwt: {
        secret: process.env.JWT_SECRET || "123qwe!@dfe4r54@@!^%$%^&^*%^^&dfg45234",
        expiresIn: process.env.JWT_EXPIRES_IN || "24h",
    },

    // تنظیمات Logging
    logging: {
        level: process.env.LOG_LEVEL || "info",
        prettyPrint: process.env.NODE_ENV === "development",
        redact: ["password", "secret", "token", "apiKey"],
    },



};
