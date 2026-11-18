const logger = require('../../utils/logger');
const SendMessageService = require('./SendMessage.service')
const LessonReop = require("../repository/Lesson.repository")
const ApiHandler = require('./api')
class LessonService {
    constructor(db) {
        this.db = db;
        this.apiHandler = new ApiHandler;
        this.sendMessageService = new SendMessageService(db);
        this.lessonRepo = new LessonReop(db)
        this.LESSONS = []
    }
    async getDailyLessondsFromDB() {
        try {
            const lessons = await this.lessonRepo.getDailyLesson()
            if (!lessons)
                return false
            this.LESSONS = lessons
            return this.LESSONS;
        } catch (err) {
            logger.error(`[Lesson] Get Daily Lesson Error : ${err}`)
        }
    }
    async getLesson(lessonId) {
        try {
            const lesson = await this.lessonRepo.getLesson(lessonId)
            if (!lesson)
                return false
            return lesson;
        } catch (err) {
            logger.error(`[Lesson] Get Lesson Error : ${err}`)
        }
    }
    async sendEducationalFile(chatId, file) {
        let method;
        const body = {
            chat_id: chatId,
            caption: file?.caption || ""
        };

        switch (file.type) {
            case "photo":
                method = "sendPhoto";
                body.photo = file.file_id;
                break;
            case "video":
                method = "sendVideo";
                body.video = file.file_id;
                break;
            case "audio":
                method = "sendAudio";
                body.audio = file.file_id;
                break;
            case "document":
            default:
                method = "sendDocument";
                body.document = file.file_id;
                break;
        }

        return this.apiHandler.api(method, body);
    }

    async sendLesson(chatId, lesson) {
        // await this.sendMessage(chatId, LESSON.text);
        try {
            await this.sendEducationalFile(chatId, lesson);
        } catch (err) {
            console.error("File send error:", err);
        }
        await new Promise(r => setTimeout(r, 1000))
        await this.sendMessageService.sendMessage(
            chatId,
            "👇 آماده‌ای؟ آزمون رو شروع کن:",
            {
                inline_keyboard: [
                    [{ text: "🚀 شروع آزمون", callback_data: `start_quiz:${lesson.id}` }]
                ]
            }
        );
    }

    async existLesson(lesson_id) {
        try {
            const result = await this.lessonRepo.existLesson(lesson_id)
            return result;
        } catch (err) {
            logger.error("[Lesson] Exist Lesson Error :", err);
        }
    }
}

module.exports = LessonService;