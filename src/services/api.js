const config = require("../../utils/config");
const logger = require("../../utils/logger");
const API = `https://api.splus.ir/bot${config.HSEBotToken}`;

class ApiHandler {
    constructor() {
        this.API = API
    }
    async api(method, body = null) {
        try{

            const response = await fetch(`${this.API}/${method}`, {
                method: body ? "POST" : "GET",
                headers: { "Content-Type": "application/json" },
                body: body ? JSON.stringify(body) : undefined
            });
            return response.json();
        }catch(err){
            logger.error(`[API] ERROR : ${err}`)
        }
    }

}

module.exports = ApiHandler