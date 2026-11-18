// src/controllers/Admin.controller.js
const AdminService = require('../services/Admin.service');
const LessonService = require('../services/Lesson.service');
const AdminStates = require('../states/AdminState');
const UserService = require('../services/User.service')
const SendMessageService = require('../services/SendMessage.service');
class AdminController {
    constructor(db) {
        this.db = db;
        this.adminService = new AdminService(db);
        this.lessonService = new LessonService(db);
        this.adminStates = new AdminStates(db);
        this.userService = new UserService(db);
        this.sendMessageService = new SendMessageService(db);
    }



    // -------------------------
    // منوی اصلی ادمین
    // -------------------------
    async showAdminMenu(chatId) {
        await this.sendMessageService.sendMessage(
            chatId,
            `👨‍💼 پنل مدیریت\n\n` +
            `لطفاً یکی از گزینه‌ها را انتخاب کنید:`,
            {
                inline_keyboard: [
                    [{ text: "📚 آپلود درس جدید", callback_data: "admin_upload_lesson" }],
                    [{ text: "❓ افزودن سؤال", callback_data: "admin_add_question" }],
                    [{ text: "📢 ارسال هشدار آزمون", callback_data: "admin_send_alert" }],
                    [{ text: "📊 آمار ربات", callback_data: "admin_stats" }],
                    [{ text: "👷‍♂️ ثبت کاربر جدید", callback_data: "admin_add_user" }]
                ]
            }
        );
    }

    // -------------------------
    // پردازش پیام‌های ادمین
    // -------------------------
    async handleMessage(message) {
        const chatId = message.chat.id;
        const username = message.from?.username;

        if (!(await this.adminService.isAdmin(username))) {
            return false; // ادمین نیست
        }

        const state = await this.adminStates.getState(chatId);

        // اگر حالت خاصی ندارد → منو
        if (!state) {
            await this.showAdminMenu(chatId);
            return true;
        }

        // بر اساس حالت فعلی
        switch (state.state) {
            case 'wait_lesson_file':
                return this.handleLessonFile(message, state);
            case 'wait_lesson_name':
                return this.handleLessonName(message, state);
            case 'wait_lesson_caption':
                return this.handleLessonCaption(message, state);
            case 'wait_question_text':
                return this.handleQuestionText(message, state);
            case 'wait_question_options':
                return this.handleQuestionOptions(message, state);
            case 'wait_question_correct':
                return this.handleQuestionCorrect(message, state);
            case 'wait_alert_lesson':
                return this.handleAlertLesson(message, state);
            case 'wait_phone_user':
                return this.handleGetPhoneUSer(message, state);
            default:
                await this.adminStates.clearState(chatId);
                await this.showAdminMenu(chatId);
                return true;
        }
    }

    // ============================================
    // 📚 آپلود درس
    // ============================================

    async handleLessonFile(message, state) {
        const chatId = message.chat.id;

        // اگر فایل ارسال شده
        if (message.photo || message.video || message.document) {
            let file_id, type;

            if (message.photo) {
                // بزرگ‌ترین سایز
                const photo = message.photo[message.photo.length - 1];
                file_id = photo.file_id;
                type = 'photo';
            } else if (message.video) {
                file_id = message.video.file_id;
                type = 'video';
            } else if (message.document) {
                file_id = message.document.file_id;
                type = 'document';
            }

            await this.adminStates.setState(chatId, 'wait_lesson_name', {
                file_id,
                type
            });

            await this.sendMessageService.sendMessage(
                chatId,
                `✅ فایل دریافت شد (${type}).\n\n` +
                `حالا نام درس را ارسال کنید (مثلاً: اصول ایمنی کارگاه):`
            );
            return true;
        }

        // اگر متن ارسال شد (نه فایل)
        await this.sendMessageService.sendMessage(
            chatId,
            `⚠️ لطفاً یک فایل (عکس، ویدیو یا PDF) ارسال کنید.\n` +
            `برای انصراف /cancel را بزنید.`
        );
        return true;
    }

    async handleLessonName(message, state) {
        const chatId = message.chat.id;
        const name = message.text?.trim();

        if (!name) {
            await this.sendMessageService.sendMessage(chatId, 'لطفاً نام درس را به صورت متن ارسال کنید.');
            return true;
        }

        await this.adminStates.setState(chatId, 'wait_lesson_caption', {
            ...state.data,
            name
        });

        await this.sendMessageService.sendMessage(
            chatId,
            `✅ نام درس ثبت شد: «${name}»\n\n` +
            `حالا توضیحات (caption) درس را ارسال کنید.\n` +
            `اگر نمی‌خواهید توضیحی اضافه کنید، /skip را بزنید.`
        );
        return true;
    }

    async handleLessonCaption(message, state) {
        const chatId = message.chat.id;
        const text = message.text?.trim();

        let caption = text;
        if (text === '/skip') caption = '';

        const { file_id, type, name } = state.data;

        try {
            const lesson = await this.adminService.createLesson({
                file_id,
                type,
                name,
                caption,
                chatId
            });

            await this.adminStates.clearState(chatId);

            await this.sendMessageService.sendMessage(
                chatId,
                `✅ درس با موفقیت ذخیره شد!\n\n` +
                `📚 نام: ${lesson.name}\n` +
                `🆔 شناسه: ${lesson.id}\n\n` +
                `حالا می‌توانید سؤال اضافه کنید.`,
                {
                    inline_keyboard: [
                        [{ text: "❓ افزودن سؤال", callback_data: `admin_add_question:${lesson.id}` }],
                        [{ text: "🔙 بازگشت به منو", callback_data: "admin_menu" }]
                    ]
                }
            );
        } catch (err) {
            console.error(err);
            await this.sendMessageService.sendMessage(chatId, '❌ خطا در ذخیره درس.');
            await this.adminStates.clearState(chatId);
        }
        return true;
    }

    // ============================================
    // ❓ افزودن سؤال
    // ============================================

    async startAddQuestion(chatId, lessonId) {
        // بررسی وجود درس
        let lesson;

        lesson = await this.lessonService.existLesson(lessonId)

        if (!lesson) {
            await this.sendMessageService.sendMessage(chatId, '❌ درسی با این شناسه یافت نشد.');
            return;
        }

        await this.adminStates.setState(chatId, 'wait_question_text', { lessonId });

        await this.sendMessageService.sendMessage(
            chatId,
            `❓ افزودن سؤال برای درس: «${lesson.name}»\n\n` +
            `متن سؤال را ارسال کنید:`
        );
    }

    async handleQuestionText(message, state) {
        const chatId = message.chat.id;
        const question = message.text?.trim();

        if (!question) {
            await this.sendMessageService.sendMessage(chatId, 'لطفاً متن سؤال را ارسال کنید.');
            return true;
        }

        await this.adminStates.setState(chatId, 'wait_question_options', {
            ...state.data,
            question
        });

        await this.sendMessageService.sendMessage(
            chatId,
            `✅ سؤال ثبت شد.\n\n` +
            `حالا ۴ گزینه را در ۴ خط جداگانه ارسال کنید:\n\n` +
            `مثال:\n` +
            `سیستم ترمز\n` +
            `رنگ دستگاه\n` +
            `شماره پلاک\n` +
            `مدل دستگاه`
        );
        return true;
    }

    async handleQuestionOptions(message, state) {
        const chatId = message.chat.id;
        const text = message.text?.trim();

        if (!text) {
            await this.sendMessageService.sendMessage(chatId, 'لطفاً ۴ گزینه را ارسال کنید.');
            return true;
        }

        const options = text.split('\n').map(o => o.trim()).filter(Boolean);

        if (options.length !== 4) {
            await this.sendMessageService.sendMessage(
                chatId,
                `⚠️ باید دقیقاً ۴ گزینه ارسال کنید. شما ${options.length} گزینه فرستادید.\n` +
                `دوباره تلاش کنید.`
            );
            return true;
        }

        await this.adminStates.setState(chatId, 'wait_question_correct', {
            ...state.data,
            options
        });

        await this.sendMessageService.sendMessage(
            chatId,
            `✅ گزینه‌ها ثبت شدند:\n\n` +
            `1️⃣ ${options[0]}\n` +
            `2️⃣ ${options[1]}\n` +
            `3️⃣ ${options[2]}\n` +
            `4️⃣ ${options[3]}\n\n` +
            `حالا شماره گزینه صحیح را ارسال کنید (1 تا 4):`
        );
        return true;
    }

    async handleQuestionCorrect(message, state) {
        const chatId = message.chat.id;
        const num = parseInt(message.text?.trim(), 10);

        if (isNaN(num) || num < 1 || num > 4) {
            await this.sendMessageService.sendMessage(
                chatId,
                '⚠️ لطفاً یک عدد بین 1 تا 4 ارسال کنید.'
            );
            return true;
        }

        const { lessonId, question, options } = state.data;
        const correctIndex = num - 1;

        try {
            await this.adminService.createQuestion({
                lessonId,
                question,
                options,
                correctIndex
            });

            await this.adminStates.clearState(chatId);

            await this.sendMessageService.sendMessage(
                chatId,
                `✅ سؤال با موفقیت ذخیره شد!\n\n` +
                `📝 سؤال: ${question}\n` +
                `✅ پاسخ صحیح: ${options[correctIndex]}`,
                {
                    inline_keyboard: [
                        [{ text: "❓ افزودن سؤال دیگر", callback_data: `admin_add_question:${lessonId}` }],
                        [{ text: "🔙 بازگشت به منو", callback_data: "admin_menu" }]
                    ]
                }
            );
        } catch (err) {
            console.error(err);
            await this.sendMessageService.sendMessage(chatId, '❌ خطا در ذخیره سؤال.');
            await this.adminStates.clearState(chatId);
        }
        return true;
    }

    // ============================================
    // 📢 ارسال هشدار آزمون
    // ============================================

    async startSendAlert(chatId) {
        const lessons = await this.adminService.getRecentLessons(10);

        if (lessons.length === 0) {
            await this.sendMessageService.sendMessage(
                chatId,
                '⚠️ هنوز درسی آپلود نکرده‌اید.'
            );
            return;
        }

        const keyboard = {
            inline_keyboard: lessons.map(lesson => [
                {
                    text: `📚 ${lesson.name} (ID: ${lesson.id})`,
                    callback_data: `admin_alert_lesson:${lesson.id}`
                }
            ]).concat([
                [{ text: "🔙 بازگشت", callback_data: "admin_menu" }]
            ])
        };

        await this.sendMessageService.sendMessage(
            chatId,
            `📢 کدام درس را برای کاربران هشدار بدهیم؟`,
            keyboard
        );
    }

    async sendAlertToAll(chatId, lessonId) {
        // دریافت اطلاعات درس
        let lesson;
        lesson = await this.lessonService.existLesson(lessonId)

        if (!lesson) {
            await this.sendMessageService.sendMessage(chatId, '❌ درس یافت نشد.');
            return;
        }

        // دریافت همه کاربران
        const chatIds = await this.adminService.getAllUsersChatIds();

        if (chatIds.length === 0) {
            await this.sendMessageService.sendMessage(chatId, '⚠️ هیچ کاربری ثبت‌نام نکرده است.');
            return;
        }

        await this.sendMessageService.sendMessage(
            chatId,
            `⏳ در حال ارسال هشدار به ${chatIds.length} کاربر...`
        );

        let success = 0;
        let failed = 0;

        for (const userChatId of chatIds) {
            try {
                await this.sendMessageService.sendMessage(
                    userChatId,
                    `📢 هشدار!\n\n` +
                    `درس جدیدی با عنوان «${lesson.name}» آپلود شد.\n` +
                    `برای مشاهده و شرکت در آزمون، روی دکمه زیر بزنید 👇`,
                    {
                        inline_keyboard: [
                            [{
                                text: "🚀 شروع درس جدید",
                                callback_data: `start_lesson:${lessonId}`
                            }]
                        ]
                    }
                );
                success++;
                // تاخیر کوچک برای جلوگیری از rate limit
                await new Promise(r => setTimeout(r, 100));
            } catch (err) {
                console.error(`Failed to send to ${userChatId}:`, err.message);
                failed++;
            }
        }

        await this.sendMessageService.sendMessage(
            chatId,
            `✅ ارسال هشدار به پایان رسید.\n\n` +
            `📤 موفق: ${success}\n` +
            `❌ ناموفق: ${failed}`,
            {
                inline_keyboard: [
                    [{ text: "🔙 بازگشت به منو", callback_data: "admin_menu" }]
                ]
            }
        );
    }

    // ============================================
    // 📊 آمار
    // ============================================

    async showStats(chatId) {
        const stats = await this.adminService.getStats();

        await this.sendMessageService.sendMessage(
            chatId,
            `📊 آمار ربات\n\n` +
            `👥 کاربران: ${stats.users_count}\n` +
            `📚 دروس: ${stats.lessons_count}\n` +
            `❓ سؤالات: ${stats.questions_count}\n` +
            `📝 آزمون‌های انجام‌شده: ${stats.scores_count}`,
            {
                inline_keyboard: [
                    [{ text: "🔙 بازگشت به منو", callback_data: "admin_menu" }]
                ]
            }
        );
    }

    async addUser(chatId) {
        await this.adminStates.setState(chatId, 'wait_phone_user');
        await this.sendMessageService.sendMessage(chatId, "شماره تلفن و نام کاربری را به صورت مثال زیر ارسال نمایید :\n\n09.......\nعلی قاسمی")
    }

    async handleGetPhoneUSer(message, state = null) {
        const chatId = message.chat.id;
        const text = message.text?.trim();
        let phone = null
        await this.adminStates.clearState(chatId);
        const options = text.split('\n').map(o => o.trim()).filter(Boolean);
        if (options.length != 2) {
            await this.sendMessageService.sendMessage(chatId, "مشکل در ارسال نام کاربری و شماره تلفن.\n\n لطفا دوباره امتحان کنید ", {
                inline_keyboard: [
                    [{ text: "👷‍♂️ ثبت کاربر جدید", callback_data: "admin_add_user" }]
                ]
            })
            return true;
        }
        phone = this.normalizePhone(options[0]);
        const existUser = await this.userService.getUserByPhone(phone)
        if (existUser) {
            await this.sendMessageService.sendMessage(chatId, "این شماره تلفن قبلا برای کاربر زیر تعریف شده است :\n" + existUser.full_name)
            return true;
        }
        const newUser = await this.userService.createUser(options[0], options[1]);
        if (!newUser) {
            await this.sendMessageService.sendMessage(chatId, "ایجاد کاربر به مشکل برخورد\n\nبا ادمین تماس بگیرید")
            return true;
        }
        await this.sendMessageService.sendMessage(chatId, `کاربری جدید با مشخصات زیر ایجاد گردید :\n\n
            نام کاربر : ${options[1]}\nشماره تلفن کاربر : ${options[0]}`)
        return true;
    }

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
}

module.exports = AdminController;