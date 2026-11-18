
class AdminRepository {
    constructor(db) {
        this.db = db;
    }

    async getState(chatId) {
        const sql = "SELECT state, data FROM admin_states WHERE chat_id = $1";
        const values = [chatId];
        const result = await this.db.read(sql,values)

        return result.rows[0]
    }
    async setState(chatId, state, data) {
        const sql = `INSERT INTO admin_states (chat_id, state, data, updated_at)
                 VALUES ($1, $2, $3, NOW())
                 ON CONFLICT (chat_id)
                 DO UPDATE SET state = $2, data = $3, updated_at = NOW()`;
        const values = [chatId, state, JSON.stringify(data)];
        const result = await this.db.write(sql, values)
        return result.rows[0]
    }
    async updateState(chatId, newData) {
        const current = await this.getState(chatId);
        const merged = { ...(current?.data || {}), ...newData };
        const sql = `UPDATE admin_states SET data = $1, updated_at = NOW() WHERE chat_id = $2`;
        const values = [JSON.stringify(merged), chatId];
        const result = await this.db.write(sql, values)
        return result.rows[0]
    }
    async clearState(chatId) {

        const sql = 'DELETE FROM admin_states WHERE chat_id = $1';
        const values = [chatId];
        const result = await this.db.write(sql, values)
        return result.rows[0]
    }
    async isAdmin(username) {

        const sql = 'SELECT * FROM users WHERE username = $1 LIMIT 1';
        const values = [username];
        const result = await this.db.read(sql, values)
        return result.rows[0]?.role === 'admin';
    }

    async getStats() {

        const sql = `
                SELECT
                    (SELECT COUNT(*) FROM users ) AS users_count,
                    (SELECT COUNT(*) FROM lessons) AS lessons_count,
                    (SELECT COUNT(*) FROM questions) AS questions_count,
                    (SELECT COUNT(*) FROM scores) AS scores_count
            `;
        const values = [];
        const result = await this.db.read(sql)
        return result.rows[0]
    }

}

module.exports = AdminRepository;