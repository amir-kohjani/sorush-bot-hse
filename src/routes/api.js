async function apiRoutes(fastify, options) {

    // دریافت لیست سؤالات از دیتابیس
    fastify.get('/questions', async (req, reply) => {
        const client = await fastify.pg.connect();
        try {
            const { rows } = await client.query(
                'SELECT id, question, options, correct_index FROM questions ORDER BY id'
            );
            return { success: true, questions: rows };
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, error: err.message });
        } finally {
            client.release();
        }
    });

    // ذخیره امتیاز کاربر
    fastify.post('/score', async (req, reply) => {
        const { chatId, score, total } = req.body;

        const client = await fastify.pg.connect();
        try {
            await client.query(
                `INSERT INTO scores (chat_id, score, total, created_at) 
                 VALUES ($1, $2, $3, NOW())`,
                [chatId, score, total]
            );
            return { success: true };
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, error: err.message });
        } finally {
            client.release();
        }
    });
}

module.exports = apiRoutes;