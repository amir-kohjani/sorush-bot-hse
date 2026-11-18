class ScoreRepository {
    constructor(db) {
        this.db = db;
    }

    // -------------------------
    // ثبت امتیاز کاربر برای یک درس
    // -------------------------
    async setScoreUser(username, chatId, lessonId, score) {
        // 🔥 اصلاح شرط: !chatId به جای chatId
        if (!username || !chatId || !lessonId) return false;

        const sql = `
            INSERT INTO scores (username, lesson_id, chat_id, score, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (username, lesson_id)
            DO UPDATE SET score = EXCLUDED.score, created_at = NOW()
            RETURNING *
        `;
        const values = [username, lessonId, chatId, score];
        const result = await this.db.write(sql, values);
        return result.rows[0];
    }

    // -------------------------
    // مجموع امتیاز یک کاربر
    // -------------------------
    async getTotalScoreUser(username) {
        if (!username) return 0;

        const sql = `
            SELECT 
                COALESCE(SUM(score), 0) AS total_score,
                COUNT(*) AS lessons_count
            FROM scores
            WHERE username = $1
        `;
        const values = [username];
        // 🔥 برای SELECT از query استفاده کن (نه write)
        const result = await this.db.read(sql, values);
        return result.rows[0] || { total_score: 0, lessons_count: 0 };
    }

    // -------------------------
    // مجموع امتیاز یک کاربر بر اساس chat_id
    // -------------------------
    async getTotalScoreByChatId(chatId) {
        if (!chatId) return 0;

        const sql = `
            SELECT 
                COALESCE(SUM(score), 0) AS total_score,
                COUNT(*) AS lessons_count
            FROM scores
            WHERE chat_id = $1
        `;
        const result = await this.db.read(sql, [chatId]);
        return result.rows[0] || { total_score: 0, lessons_count: 0 };
    }

    // -------------------------
    // امتیاز یک درس خاص برای یک کاربر
    // -------------------------
    async getScoreByLesson(username, lessonId) {
        if (!username || !lessonId) return null;

        const sql = `
            SELECT * FROM scores
            WHERE username = $1 AND lesson_id = $2
            LIMIT 1
        `;
        const result = await this.db.read(sql, [username, lessonId]);
        return result.rows[0] || null;
    }

    // -------------------------
    // همه امتیازات یک درس (برای ادمین)
    // -------------------------
    async getScoresByLesson(lessonId) {
        if (!lessonId) return [];

        const sql = `
            SELECT s.*, u.first_name
            FROM scores s
            LEFT JOIN users u ON u.username = s.username
            WHERE s.lesson_id = $1
            ORDER BY s.score DESC, s.created_at ASC
        `;
        const result = await this.db.read(sql, [lessonId]);
        return result.rows;
    }

    // -------------------------
    // همه امتیازات (برای گزارش‌گیری)
    // -------------------------
    async getAllScores() {
        const sql = `
            SELECT 
                s.username,
                u.first_name,
                COALESCE(SUM(s.score), 0) AS total_score,
                COUNT(s.lesson_id) AS lessons_count,
                MAX(s.created_at) AS last_activity
            FROM scores s
            LEFT JOIN users u ON u.username = s.username
            GROUP BY s.username, u.first_name
            ORDER BY total_score DESC
        `;
        const result = await this.db.read(sql);
        return result.rows;
    }
}

module.exports = ScoreRepository;