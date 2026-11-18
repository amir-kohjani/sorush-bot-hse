// src/services/Admin.service.js
const LessonRepo = require("../repository/Lesson.repository")
const QuestionRepo = require("../repository/Question.repository")
const UserRepo = require("../repository/User.repository");
const AdminRepo = require("../repository/Admin.repository");
const logger = require("../../utils/logger")
class AdminService {
    constructor(db) {
        this.db = db;
        this.lessonRepo = new LessonRepo(db);
        this.questionRepo = new QuestionRepo(db);
        this.userRepo = new UserRepo(db);
        this.adminRepo = new AdminRepo(db);
    }


    // -------------------------
    // بررسی ادمین بودن
    // -------------------------
    async isAdmin(username) {
        try {
            const result = await this.adminRepo.isAdmin(username);
            return result;
        } catch (err) {
            logger.error(`[Admin] isAdmin Error : ${err}`)
        }
    }
    // -------------------------
    // ذخیره درس جدید
    // -------------------------
    async createLesson({ file_id, type, name, caption, chatId }) {
        try {
            const result = await this.lessonRepo.createLesson(file_id, type, name, caption, chatId)
            return result;
        } catch (err) {
            logger.error(`[Admin] Create Lesson Error : ${err}`)
        }
    }

    // -------------------------
    // ذخیره سؤال جدید برای یک درس
    // -------------------------
    async createQuestion({ lessonId, question, options, correctIndex }) {
        try {
            const result = await this.questionRepo.createQuestion(lessonId, question, options, correctIndex)
            return result;
        } catch (err) {
            logger.error(`[admin] Create Question Error : ${err}`)
        }
    }

    // -------------------------
    // دریافت آخرین درس‌ها
    // -------------------------
    async getRecentLessons(limit = 5) {
        try {
            const result = await this.questionRepo.getRecentLessons(limit);
            return result;
        } catch (err) {
            logger.error(`[admin] Get Recent Question Error : ${err}`)
        }
    }

    // -------------------------
    // دریافت همه کاربران (برای ارسال هشدار)
    // -------------------------
    async getAllUsersChatIds() {
        try {
            const result = await this.userRepo.getAllUsersChatIds();
            return result
        } catch (e) {
            logger.error(`[Admin] Get All ChateIds Error : ${e}`)
        }
    }

    // -------------------------
    // آمار کلی
    // -------------------------
    async getStats() {
        try {
            const result = await this.adminRepo.getStats();
            return result;
        } catch (e) {
            logger.error(`[Admin] Get All State Error : ${e}`)
        }
    }
}

module.exports = AdminService;