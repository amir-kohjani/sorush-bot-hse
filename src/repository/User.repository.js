class UserRepository {
    constructor(db) {
        this.db = db;
    }

    async createUser(user) {
        if (!user) return false;
        const sql = `INSERT INTO users
                (phone,full_name)
            VALUES ($1, $2)
            RETURNING id,full_name,phone,role,created_at`
        const values = [user.phone, user.full_name];
        const result = await this.db.write(sql, values);
        return result.rows[0];
    }

    async getUserByUsername(username) {
        if (!username) return false;
        const sql = `SELECT id,username,chat_id,first_name,is_active,role from users WHERE username = $1`
        const values = [username]
        const result = await this.db.read(sql, values)
        return result.rows[0];
    }
    async getUserByPhone(phone) {
        if (!phone) return false;
        const sql = `SELECT * from users WHERE phone = $1`
        const values = [phone]
        const result = await this.db.read(sql, values)
        return result.rows[0];
    }
    async getUserByChatId(chatId) {
        if (!chatId) return false;
        const sql = `SELECT id,username,chat_id,first_name,is_active,role from users WHERE chat_id = $1`
        const values = [chatId]
        const result = await this.db.read(sql, values)
        return result.rows[0];
    }
    async updateUserContact(user) {
        if (!user) return false;
        const sql = `UPDATE users 
                 SET chat_id = $3, username = $1, first_name = $2
                 WHERE id = $4
                 RETURNING *`
        const values = [user.username, user.first_name, user.chatId, user.id]
        const result = await this.db.read(sql, values)
        return result.rows[0];
    }


    async getRoleUser(username) {
        if (!username) return false;
        const sql = `SELECT role,is_active from users WHERE username = $1`
        const values = [username]
        const result = await this.db.read(sql, values)
        return result.rows[0];
    }
    async getAllUsersChatIds() {

        const sql = `SELECT chat_id FROM users 
                 WHERE chat_id IS NOT NULL 
                 `;
        const values = []
        const { rows } = await this.db.read(sql)
        return rows.map(r => r.chat_id);
    }


}

module.exports = UserRepository