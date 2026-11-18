
class LessonRepository {
    constructor(db) {
        this.db = db;
    }

    async getDailyLesson() {
        const sql = "SELECT id, caption, file_id,type, chat_id FROM lessons ORDER BY created_at DESC LIMIT 1";
        const values = [];
        const result = await this.db.read(sql)

        return result.rows[0]
    }
    async getLesson(lessonId) {
        const sql = "SELECT id, caption, file_id,type, chat_id FROM lessons WHERE id = $1";
        const values = [lessonId];
        const result = await this.db.read(sql, values)

        return result.rows[0]
    }
    async existLesson(leeson_id) {
        const sql = 'SELECT * FROM lessons WHERE id = $1';
        const values = [leeson_id];
        const result = await this.db.read(sql, values)
        return result.rows[0]
    }
    async createLesson(file_id, type, name, caption, chat_id) {
        const sql = `INSERT INTO lessons (file_id, type, name, caption,chat_id)
                 VALUES ($1, $2, $3, $4,$5)
                 RETURNING *`;
        const values = [file_id, type, name, caption, chat_id];
        const result = await this.db.write(sql, values)

        return result.rows[0]
    }
}

module.exports = LessonRepository;