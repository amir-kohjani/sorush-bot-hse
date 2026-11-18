

class QuestionReopsitory {
    constructor(db) {
        this.db = db;
    }
    async getQuestion(lessonId) {
        const sql = 'SELECT id, question, options, correct_index FROM questions WHERE lesson_Id = $1'
        const values = [lessonId];
        const result = await this.db.read(sql, values)

        return result.rows
    }
    async getRecentLessons(limit) {
        const sql = `SELECT * FROM lessons ORDER BY id DESC LIMIT $1`;
        const values = [limit];
        const result = await this.db.write(sql, values)

        return result.rows
    }
    async createQuestion(lessonId, question, options, correctIndex) {
        const sql = `INSERT INTO questions (lesson_id, question, options, correct_index)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`;
        const values = [lessonId, question, JSON.stringify(options), correctIndex];
        const result = await this.db.write(sql, values)

        return result.rows
    }
}

module.exports = QuestionReopsitory