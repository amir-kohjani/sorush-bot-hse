const SendMessageService = require("../services/SendMessage.service")
const QuizService = require("../services/Quiz.service")
const LessonService = require("../services/Lesson.service")
const UserService = require("../services/User.service")

class MessageController {
    constructor(db) {
        this.quizService = new QuizService(db);
        this.sendMessageService = new SendMessageService(db);
        this.LessonService = new LessonService(db);
        this.userService = new UserService(db);
        this.user = null
    }

    async handleMessage(message) {
        const chatId = message.chat.id;
        const text = message.text?.trim();
        const { username, first_name } = message?.from;
        const user = await this.userService.getUser(username)
        if (!user) {
            await this.sendMessageService.sendMessage(
                chatId,
                `سلام ${message.from.first_name} 👋\n\n` +
                `به ربات آموزش HSE خوش اومدی!`, {
                inline_keyboard: [
                    [{ text: "ثبت نام اولیه", callback_data: "auth_user" }],
                ]
            }
            );
            // const userByPhone = await this.userService.getUserByPhone()
            // const newUser = await this.userService.createUser(username, chatId, first_name)
            // this.user = newUser;
        } else this.user = user
        console.log({
            chatId,
            user: message.from?.username,
            // role: this.user.role,
            text
        });
        if (text === "/start" && this.user) {
            await this.sendMessageService.sendMessage(
                chatId,
                `سلام ${message.from.first_name} 👋\n\n` +
                `به ربات آموزش HSE خوش اومدی!`, {
                inline_keyboard: [
                    [{ text: "📕 شروع آموزش روزانه", callback_data: "start_lesson" }],
                ]
            }
            );
            return;
        }
        await this.sendMessageService.sendMessage(chatId, "دستور مورد نظر را متوجه نشدم. برای شروع /start را بزنید.");
    }
    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const callbackQueryId = callbackQuery.id
     
        // دکمه شروع آزمون
        if (data === "start_quiz") {
            await this.sendMessageService.notifCallbackQuery(callbackQuery.id, "آزمون شروع شد!!!");
            await this.quizService.startQuiz(chatId);
            return;
        }

        // دکمه پاسخ سؤال
        if (data.startsWith("answer:"))
            this.quizService.answerQuiz(data, chatId, messageId, callbackQueryId)
        // دکمه شروع درس روزانه
        if (data.startsWith("start_lesson")) {
            const lessonFile = await this.LessonService.getDailyLessondsFromDB();
            if (!lessonFile)
                await this.sendMessageService.notifCallbackQuery(callbackQueryId, 'درسی برای امروز موجود نیست!')
            else
                await this.LessonService.sendLesson(chatId, lessonFile);
        }
    }

}

module.exports = MessageController