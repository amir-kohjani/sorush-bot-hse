const ApiHandler = require("./api")

class SendMessageService {
    constructor(db) {
        this.apiHanlder = new ApiHandler;
        this.db = db;
    }

    async sendMessage(chatId, text, keyboard = null) {
        const body = {
            chat_id: chatId,
            text
        };

        if (keyboard) {
            body.reply_markup = JSON.stringify(keyboard);
        }

        return this.apiHanlder.api("sendMessage", body);
    }


    async sendEducationalFile(chatId, file) {
        let method;
        const body = {
            chat_id: chatId,
            caption: file.caption || ""
        };

        switch (file.type) {
            case "photo":
                method = "sendPhoto";
                body.photo = file.file_id;
                break;
            case "video":
                method = "sendVideo";
                body.video = file.file_id;
                break;
            case "audio":
                method = "sendAudio";
                body.audio = file.file_id;
                break;
            case "document":
            default:
                method = "sendDocument";
                body.document = file.file_id;
                break;
        }

        return this.apiHanlder.api(method, body);
    };
    async notifCallbackQuery(callbackQueryId, text = "") {
        return this.apiHanlder.api("answerCallbackQuery", {
            callback_query_id: callbackQueryId,
            text
        });
    }

    async editMessageText(chatId, messageId, text, keyboard = null) {
        const body = {
            chat_id: chatId,
            message_id: messageId,
            text
        };

        if (keyboard) {
            body.reply_markup = JSON.stringify(keyboard);
        }

        return this.apiHanlder.api("editMessageText", body);
    }
}

module.exports = SendMessageService