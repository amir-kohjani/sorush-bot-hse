const ScoreRepo = require('../repository/Score.repository');

class ScoreService {
    constructor(db) {
        this.db = db;
        this.scoreRepo = new ScoreRepo(db);
    }

    // -------------------------
    // ثبت امتیاز بر اساس username
    // -------------------------
    async setScoreByUsername(username, chatId, lessonId, score) {
        try {
            if (!username || !chatId || !lessonId) {
                throw new Error('username, chatId و lessonId الزامی هستند');
            }

            // اعتبارسنجی امتیاز
            const numericScore = Number(score);
            if (isNaN(numericScore) || numericScore < 0) {
                throw new Error('امتیاز باید یک عدد مثبت باشد');
            }

            const result = await this.scoreRepo.setScoreUser(
                username,
                chatId,
                lessonId,
                numericScore
            );

            return {
                success: true,
                data: result
            };
        } catch (error) {
            console.error('ScoreService.setScoreByUsername error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // -------------------------
    // ثبت امتیاز بر اساس chatId
    // -------------------------
    async setScoreByChatId(chatId, lessonId, score) {
        try {
            if (!chatId || !lessonId) {
                throw new Error('chatId و lessonId الزامی هستند');
            }

            // پیدا کردن کاربر بر اساس chatId
            const userSql = `SELECT username FROM users WHERE chat_id = $1 LIMIT 1`;
            const userResult = await this.db.query(userSql, [chatId]);

            if (!userResult.rows[0]) {
                throw new Error('کاربری با این chatId یافت نشد');
            }

            const username = userResult.rows[0].username;
            return await this.setScoreByUsername(username, chatId, lessonId, score);

        } catch (error) {
            console.error('ScoreService.setScoreByChatId error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // -------------------------
    // مجموع امتیاز یک کاربر
    // -------------------------
    async getTotalUserScore(username) {
        try {
            if (!username) {
                throw new Error('username الزامی است');
            }

            const result = await this.scoreRepo.getTotalScoreUser(username);

            return {
                success: true,
                username,
                totalScore: Number(result.total_score) || 0,
                lessonsCount: Number(result.lessons_count) || 0
            };
        } catch (error) {
            console.error('ScoreService.getTotalUserScore error:', error);
            return {
                success: false,
                error: error.message,
                totalScore: 0,
                lessonsCount: 0
            };
        }
    }

    // -------------------------
    // مجموع امتیاز همه کاربران (گزارش)
    // -------------------------
    async getAllUserScore() {
        try {
            const rows = await this.scoreRepo.getAllScores();

            return {
                success: true,
                data: rows.map(row => ({
                    username: row.username,
                    firstName: row.first_name,
                    totalScore: Number(row.total_score) || 0,
                    lessonsCount: Number(row.lessons_count) || 0,
                    lastActivity: row.last_activity
                }))
            };
        } catch (error) {
            console.error('ScoreService.getAllUserScore error:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // -------------------------
    // امتیازات یک درس خاص
    // -------------------------
    async getLessonScore(lessonId) {
        try {
            if (!lessonId) {
                throw new Error('lessonId الزامی است');
            }

            const rows = await this.scoreRepo.getScoresByLesson(lessonId);

            // محاسبه آمار
            const totalStudents = rows.length;
            const totalScore = rows.reduce((sum, r) => sum + Number(r.score), 0);
            const averageScore = totalStudents > 0 
                ? Math.round(totalScore / totalStudents) 
                : 0;

            return {
                success: true,
                lessonId,
                stats: {
                    totalStudents,
                    totalScore,
                    averageScore
                },
                data: rows
            };
        } catch (error) {
            console.error('ScoreService.getLessonScore error:', error);
            return {
                success: false,
                error: error.message,
                data: []
            };
        }
    }

    // -------------------------
    // 🔥 متد کمکی: بررسی اینکه کاربر قبلاً آزمون داده یا نه
    // -------------------------
    async hasUserTakenLesson(username, lessonId) {
        try {
            const result = await this.scoreRepo.getScoreByLesson(username, lessonId);
            return {
                success: true,
                hasTaken: !!result,
                score: result ? Number(result.score) : null
            };
        } catch (error) {
            console.error('ScoreService.hasUserTakenLesson error:', error);
            return { success: false, hasTaken: false, score: null };
        }
    }
}

module.exports = ScoreService;