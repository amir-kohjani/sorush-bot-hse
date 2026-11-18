const SendMessageService = require("../services/SendMessage.service");
const QuizService = require("../services/Quiz.service");
const LessonService = require("../services/Lesson.service");
const UserService = require("../services/User.service");
const AdminService = require("../services/Admin.service");
const AdminState = require("../states/AdminState");
const AdminController = require('./Admin.controller');
class MessageController {
    constructor(db) {
        this.quizService = new QuizService(db);
        this.sendMessageService = new SendMessageService(db);
        this.LessonService = new LessonService(db);
        this.userService = new UserService(db);
        this.adminService = new AdminService(db);
        this.adminStates = new AdminState(db);
        this.user = null;
        this.adminController = new AdminController(db);
    }

    // -------------------------
    // هندل پیام‌های متنی
    // -------------------------
    async handleMessage(message) {
        const chatId = message.chat.id;
        const text = message.text?.trim();
        const { username, first_name } = message?.from || {};

        if (!username) {
            await this.sendMessageService.sendMessage(chatId, "⚠️ابتدا برای اکانت خود در سروش نام کاربری مناسب انتخاب نمایید.!!!")
        }
        if (message.text?.trim() === '/cancel') {
            await this.adminStates.clearState(chatId);
            await this.sendMessageService.sendMessage(chatId, '❌ عملیات لغو شد.');
            await this.adminController.showAdminMenu(chatId);
            return;
        }
        // 🔥 ۱) اگر پیام شامل شماره تلفن (contact) بود، آن را پردازش کن
        if (message.contact) {
            return this.handleContact(message);
        }
        // اگر /admin زد → منوی ادمین
        if (message.text?.trim() === '/admin') {

            if (await this.adminService.isAdmin(username)) {

                await this.adminController.showAdminMenu(chatId);
                return;
            }
        }

        // اگر در حالت آپلود بود → پردازش شود
        const handled = await this.adminController.handleMessage(message);
        if (handled) return;
        // }
        // 🔥 ۲) اگر کاربر شماره‌اش را قبلاً ذخیره کرده ولی در دیتابیس ناقص است
        const user = await this.userService.getUserByUsername(username);

        if (!user) {
            // کاربر جدید → درخواست شماره تلفن
            await this.sendMessageService.sendMessage(
                chatId,
                `سلام ${first_name} 👋\n\n` +
                `به ربات آموزش HSE خوش اومدی!\n\n` +
                `برای ادامه، لطفاً شماره تلفن خودت رو با دکمه زیر ارسال کن 👇`,
                {
                    keyboard: [
                        [{ text: "📱 ارسال شماره تلفن", request_contact: true }]
                    ],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            );
            return;
        }
        // کاربر در دیتابیس هست ولی chat_id یا username ندارد → آپدیت کن
        if (!user.chat_id || !user.username) {
            await this.userService.updateUserContact(user.id, chatId, username, first_name);
            this.user = await this.userService.getUserByUsername(username);
        } else {
            this.user = user;
        }

        console.log({
            chatId,
            user: username,
            role: this.user?.role,
            text
        });

        // -------------------------
        // /start
        // -------------------------
        if (text === "/start" && this.user) {
            await this.sendMessageService.sendMessage(
                chatId,
                `سلام ${first_name} 👋\n\n` +
                `به ربات آموزش HSE خوش اومدی!`,
                {
                    inline_keyboard: [
                        [{ text: "📕 شروع آموزش روزانه", callback_data: "start_lesson" }]
                    ]
                }
            );
            return;
        }

        await this.sendMessageService.sendMessage(
            chatId,
            "دستور مورد نظر را متوجه نشدم. برای شروع /start را بزنید."
        );
    }

    // -------------------------
    // 🔥 هندل دریافت شماره تلفن (contact)
    // -------------------------
    async handleContact(message) {
        const chatId = message.chat.id;
        const contact = message.contact;
        const { username, first_name } = message.from || {};

        // شماره تلفن معمولاً با پیشوند +98 یا 98 می‌آید
        let phone = contact.phone_number;

        // نرمال‌سازی شماره: حذف + و تبدیل 98 به 0
        const normalizedPhone = this.normalizePhone(phone);

        console.log('📱 Contact received:', {
            original: phone,
            normalized: normalizedPhone,
            chatId,
            username
        });

        // 🔍 جستجو در دیتابیس بر اساس شماره تلفن
        const existingUser = await this.userService.getUserByPhone(normalizedPhone);

        if (!existingUser) {
            // شماره در دیتابیس نیست
            await this.sendMessageService.sendMessage(
                chatId,
                `❌ متأسفانه شماره تلفن شما در سیستم ثبت نشده است.\n\n` +
                `لطفاً با مدیر تماس بگیرید تا اطلاعات شما در سیستم ثبت شود.`,
                {
                    remove_keyboard: true
                }
            );
            return;
        }

        // ✅ شماره پیدا شد → آپدیت رکورد با chat_id و username
        if (!existingUser.chat_id) {
            const updatedUser = await this.userService.updateUserContact(
                existingUser.id,
                chatId,
                username,
                first_name
            );

            await this.sendMessageService.sendMessage(
                chatId,
                `✅ ثبت‌نام شما با موفقیت انجام شد!\n\n` +
                `خوش آمدید ${updatedUser.full_name} عزیز 🌹` + "\n\n منتظر ارسال دروس روزانه باشید!",
                {
                    remove_keyboard: true
                }
            );

            // // نمایش منوی اصلی
            // await this.sendMessageService.sendMessage(
            //     chatId,
            //     `برای شروع، از دکمه زیر استفاده کنید 👇`

            // );
        } else {
            // کاربر قبلاً ثبت‌نام کرده (chat_id دارد)
            await this.sendMessageService.sendMessage(
                chatId,
                `✅ شما قبلاً در سیستم ثبت‌نام کرده‌اید.\n\n` +
                `خوش آمدید ${first_name} عزیز 🌹`,
                {
                    remove_keyboard: true
                }
            );
        }

        this.user = await this.userService.getUserByPhone(normalizedPhone);
    }

    // -------------------------
    // نرمال‌سازی شماره تلفن
    // -------------------------
    normalizePhone(phone) {
        if (!phone) return '';

        // حذف کاراکترهای غیرعددی (به جز +)
        let cleaned = phone.replace(/[^\d+]/g, '');

        // حذف + از ابتدا
        if (cleaned.startsWith('+')) {
            cleaned = cleaned.substring(1);
        }

        // تبدیل 98 به 0 (ایران)
        if (cleaned.startsWith('98')) {
            cleaned = '0' + cleaned.substring(2);
        }

        // اگر با 9 شروع شد، 0 اضافه کن
        if (cleaned.startsWith('9') && cleaned.length === 10) {
            cleaned = '0' + cleaned;
        }

        return cleaned;
    }

    // -------------------------
    // هندل Callback Query
    // -------------------------
    async handleCallbackQuery(callbackQuery) {
        const chatId = callbackQuery.message.chat.id;
        const messageId = callbackQuery.message.message_id;
        const data = callbackQuery.data;
        const callbackQueryId = callbackQuery.id;
        const username = callbackQuery.from?.username;
        // 🔥 پردازش callback های ادمین
        if (await this.adminService.isAdmin(username)) {
            // منوی ادمین
            if (data === 'admin_menu') {
                await this.sendMessageService.notifCallbackQuery(callbackQuery.id);
                await this.adminController.showAdminMenu(chatId);
                return;
            }

            // شروع آپلود درس
            if (data === 'admin_upload_lesson') {
                await this.adminController.adminStates.setState(chatId, 'wait_lesson_file');
                await this.sendMessageService.notifCallbackQuery(callbackQuery.id);
                await this.sendMessageService.sendMessage(
                    chatId,
                    `📚 آپلود درس جدید\n\n` +
                    `لطفاً فایل درس (عکس، ویدیو یا PDF) را ارسال کنید.\n` +
                    `برای انصراف /cancel را بزنید.`
                );
                return;
            }

            // افزودن سؤال
            if (data.startsWith('admin_add_question')) {

                const lessonId = data.includes(':') ? parseInt(data.split(':')[1], 10) : null;
                await this.sendMessageService.notifCallbackQuery(callbackQuery.id);
                if (lessonId) {
                    await this.adminController.startAddQuestion(chatId, lessonId);
                }
                else {
                    // نمایش لیست دروس برای انتخاب
                    const lessons = await this.adminController.adminService.getRecentLessons(10);
                    const keyboard = {
                        inline_keyboard: lessons.map(l => [
                            { text: `📚 ${l.name}`, callback_data: `admin_add_question:${l.id}` }
                        ]).concat([[{ text: "🔙 بازگشت", callback_data: "admin_menu" }]])
                    };
                    await this.sendMessageService.sendMessage(chatId, 'کدام درس؟', keyboard);
                }
                return;
            }

            // ارسال هشدار
            if (data === 'admin_send_alert') {
                await this.sendMessageService.notifCallbackQuery(callbackQuery.id);
                await this.adminController.startSendAlert(chatId);
                return;
            }

            if (data.startsWith('admin_alert_lesson:')) {
                const lessonId = parseInt(data.split(':')[1], 10);
                await this.sendMessageService.notifCallbackQuery(callbackQuery.id, 'در حال ارسال...');
                await this.adminController.sendAlertToAll(chatId, lessonId);
                return;
            }

            // آمار
            if (data === 'admin_stats') {
                await this.sendMessageService.notifCallbackQuery(callbackQuery.id);
                await this.adminController.showStats(chatId);
                return;
            }
            // ثبت کاربر
            if (data === 'admin_add_user') {
                await this.sendMessageService.notifCallbackQuery(callbackQuery.id);
                await this.adminController.addUser(chatId);
                return;
            }
        }



        // دکمه شروع آزمون
        if (data.startsWith("start_quiz")) {
            const lessonId = data.includes(':') ? parseInt(data.split(':')[1], 10) : null;
            await this.sendMessageService.notifCallbackQuery(callbackQueryId, "آزمون شروع شد!!!");
            await this.quizService.startQuiz(chatId, lessonId, username);
            return;
        }

        // دکمه پاسخ سؤال
        if (data.startsWith("answer:")) {
            await this.quizService.answerQuiz(data, chatId, messageId, callbackQueryId);
            return;
        }

        // دکمه شروع درس روزانه
        if (data.startsWith("start_lesson")) {
            const lessonId = parseInt(data.split(':')[1], 10);
            const lessonFile = await this.LessonService.getLesson(lessonId);
            if (!lessonFile) {
                await this.sendMessageService.notifCallbackQuery(
                    callbackQueryId,
                    'درسی برای امروز موجود نیست!'
                );
            } else {
                await this.LessonService.sendLesson(chatId, lessonFile);
            }
            return;
        }
    }
}

module.exports = MessageController;