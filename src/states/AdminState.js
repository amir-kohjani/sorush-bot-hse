// src/states/AdminStates.js
const AdminRepo = require('../repository/Admin.repository')
const logger = require("../../utils/logger")

class AdminStates {
    constructor(db) {
        this.db = db;
        this.adminRepo = new AdminRepo(db);
    }

    async getState(chatId) {
        try {
            const state = await this.adminRepo.getState(chatId)
            return state || null;
        } catch (e) {
            logger.error(`[AdminState] Get State Error : ${e}`)
        }
    }

    async setState(chatId, state, data = {}) {
        try {
            const result = await this.adminRepo.setState(chatId, state, data)
        } catch (e) {
            logger.error(`[AdminState] Set State Error : ${e}`)
        }
    }

    async updateData(chatId, newData) {
        try {
            const merged = await this.adminRepo.updateState(chatId, newData)
            return merged;
        } catch (e) {
            logger.error(`[AdminState] Update State Error : ${e}`)
        }
    }

    async clearState(chatId) {
        try {
            await this.adminRepo.clearState(chatId);
        } catch (e) {
            logger.error(`[AdminState] Clear State Error : ${e}`)
        }
    }
}

module.exports = AdminStates;