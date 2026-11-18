const logger = require("../../utils/logger");
const UserRepo = require("../repository/User.repository")

class UserService {
    constructor(db) {
        this.db = db;
        this.userRepo = new UserRepo(db);
    }

    async createUser(phone, full_name) {

        if (!phone || !full_name)
            return null;
        try {

            const user = await this.userRepo.createUser({ phone, full_name })
            return user;
        } catch (err) {
            logger.error(`[USER] Create User Error : ${err}`)
        }
    }
    async updateUserContact(id, chatId, username, first_name) {

        if (!username || !chatId || !first_name || !id)
            return null;
        try {

            const user = await this.userRepo.updateUserContact({ username, first_name, chatId, id })
            return user;
        } catch (err) {
            logger.error(`[USER] Create User Error : ${err}`)
        }
    }

    async getUserByUsername(username) {

        if (!username)
            return null;
        try {

            const user = await this.userRepo.getUserByUsername(username)
            return user;
        } catch (err) {
            logger.error(`[USER] Get User Error : ${err}`)
        }

    }

    async getUserByPhone(phone) {
        if (!phone)
            return null;
        try {

            const user = await this.userRepo.getUserByPhone(phone)
            return user;
        } catch (err) {
            logger.error(`[USER] Get User Error : ${err}`)
        }
    }
    async getScoreUser(username) { }

    async setScoreUser(username) { }

    async getRoleUser(username) { }
}

module.exports = UserService