const SendMessageService = require('./SendMessage.service')
const QuestionRepo = require('../repository/Question.repository');
const ScoreService = require('./Score.service')
const logger = require("../../utils/logger")
class Quiz {
    constructor(db) {
        this.SendMessageService = new SendMessageService(db)
        this.scoreService = new ScoreService(db)
        this.questionRepo = new QuestionRepo(db)
        this.userStates = {};
        this.QUESTIONS = [];
    }

    // تابع دریافت سؤالات از دیتابیس (از طریق Fastify instance)
    async getQuestionsFromDB(lessonId) {
        try {
            const questions = await this.questionRepo.getQuestion(lessonId);
            this.QUESTIONS = questions.map(row => ({
                question: row.question,
                options: row.options,
                correct: row.correct_index
            }));
        } catch (err) {
            logger.error(`[BOT] GetQuestion Error : ${err}`)
        }
    }
    // -------------------------
    // شروع آزمون
    // -------------------------
    async startQuiz(chatId, lessonId, username) {
        if (!lessonId) {
            return this.SendMessageService.sendMessage(chatId, "❌خطا در دریافت شماره درس!");
        }
        const { hasTaken } = await this.scoreService.hasUserTakenLesson(username, lessonId)
        if (hasTaken) {
            return this.SendMessageService.sendMessage(chatId, "❌شما قبلا این آزمون رو گذرانداید!!");
        }
        this.userStates[chatId] = { currentQuestion: 0, score: 0, username, lessonId };
        await this.getQuestionsFromDB(lessonId)
        await this.sendQuestion(chatId, null);
    }

    async sendQuestion(chatId, messageId = null) {
        const state = this.userStates[chatId];

        if (!state) {
            return this.SendMessageService.sendMessage(chatId, "برای شروع آزمون دستور /start را ارسال کنید.");
        }

        if (state.currentQuestion >= this.QUESTIONS.length) {
            return this.finishQuiz(chatId, messageId);
        }

        const q = this.QUESTIONS[state.currentQuestion];

        const keyboard = {
            inline_keyboard: q.options.map((opt, index) => [
                {
                    text: opt,
                    callback_data: `answer:${index}`
                }
            ])
        };

        const text =
            `🧠 سؤال ${state.currentQuestion + 1} از ${this.QUESTIONS.length}\n\n` +
            `${q.question}`;

        if (messageId) {
            return this.SendMessageService.editMessageText(chatId, messageId, text, keyboard);
        } else {
            return this.SendMessageService.sendMessage(chatId, text, keyboard);
        }
    }

    async answerQuiz(data, chatId, messageId, callbackQueryId) {
        {
            const selectedIndex = parseInt(data.split(":")[1], 10);
            const state = this.userStates[chatId];

            if (!state) {
                await this.SendMessageService.notifCallbackQuery(callbackQueryId, "آزمون منقضی شده است.");
                return;
            }

            const q = this.QUESTIONS[state.currentQuestion];
            const isCorrect = selectedIndex === q.correct;

            if (isCorrect) state.score += 1;

            // بازخورد متنی
            const feedback = isCorrect
                ? "✅ پاسخ صحیح بود!"
                : `❌ پاسخ اشتباه بود.\nپاسخ صحیح: ${q.options[q.correct]}`;

            await this.SendMessageService.notifCallbackQuery(callbackQueryId, feedback);

            // رفتن به سؤال بعدی
            state.currentQuestion += 1;
            await this.sendQuestion(chatId, messageId);
            return;
        }
    }

    async finishQuiz(chatId, messageId = null) {
        const state = this.userStates[chatId];
        console.log("🚀 ~ Quiz ~ finishQuiz ~ state:", state)

        // اگر state وجود نداشت (مثلاً دو بار کلیک شده)
        if (!state) return;
        const username = state.username
        const lessonId = state.lessonId
        const score = state.score;
        const total = this.QUESTIONS.length;
        const percent = total > 0 ? Math.round((score / total) * 100) : 0;
        await this.scoreService.setScoreByUsername(username, chatId, lessonId, score)
        let emoji = "🎉";
        if (percent < 50) emoji = "😔";
        else if (percent < 80) emoji = "👍";

        const text =
            `${emoji} آزمون به پایان رسید!\n\n` +
            `✅ پاسخ‌های صحیح: ${score} از ${total}\n` +
            `📊 درصد: ${percent}%`;

        // 🔥 کیبورد خالی برای حذف کامل دکمه‌ها
        const emptyKeyboard = {
            inline_keyboard: []   // هیچ دکمه‌ای ندارد
        };

        // پاک کردن وضعیت کاربر
        delete this.userStates[chatId];

        if (messageId) {
            // ویرایش پیام آخر و حذف کیبورد
            await this.SendMessageService.editMessageText(
                chatId,
                messageId,
                text,
                emptyKeyboard
            );
        } else {
            // اگر messageId نداشتیم، پیام جدید بدون کیبورد بفرست
            await this.SendMessageService.sendMessage(
                chatId,
                text
                // 🔥 هیچ reply_markup نفرست → کیبوردی نمایش داده نمی‌شود
            );
        }
    }
}

module.exports = Quiz