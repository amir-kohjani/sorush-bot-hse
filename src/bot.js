const config = require("../utils/config")
const QuestionRepo = require('./repository/Question.repository');
const logger = require('../utils/logger');
const ApiHandler = require("./services/api")
const MessageHandlerController = require("./controllers/Message.controller")

class Bot {
    constructor(fastify) {
        this.db = fastify.db;
        this.questionReop = new QuestionRepo(fastify.db);
        this.apiHandler = new ApiHandler;
        this.messageHandler = new MessageHandlerController(fastify.db)
    }

    // تابع ذخیره امتیاز در دیتابیس
    async saveScore(fastify, chatId, score, total) {
        const client = await fastify.pg.connect();
        try {
            await client.query(
                'INSERT INTO scores (chat_id, score, total, created_at) VALUES ($1, $2, $3, NOW())',
                [chatId, score, total]
            );
        } finally {
            client.release();
        }
    }

    async startBotPolling() {
        let offset = 0;
        logger.info("🤖 Bot polling started");

        try {
            while (true) {
                const result = await this.apiHandler.api("getUpdates", {
                    offset,
                    timeout: 30
                });

                if (!result.ok) {
                    logger.error(result);

                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }

                for (const update of result.result) {
                    offset = update.update_id + 1;
                    if (update.message) {
                        await this.messageHandler.handleMessage(update.message);
                    }
                    else if (update.callback_query) {
                        await this.messageHandler.handleCallbackQuery(update.callback_query);
                    }
                }

            }
        } catch (err) {
            logger.error(`[BOT] StartBotPolling Error : ${err}`)
        }
        // بارگذاری سؤالات از دیتابیس در شروع
        // let QUESTIONS = await this.getQuestionsFromDB();
        // console.log(`📚 Loaded ${QUESTIONS.length} questions from database`);

        // ... (بقیه منطق polling و handleMessage و handleCallbackQuery)

        // در پایان آزمون (finishQuiz):
        // await saveScore(fastify, chatId, state.score, total);
        // ... (توابع sendMessage, editMessageText, answerCallbackQuery و ...)
    }
}


module.exports = Bot;