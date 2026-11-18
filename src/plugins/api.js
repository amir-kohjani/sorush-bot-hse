const fp = require('fastify-plugin');
const ApiHandler = require("../services/api");


async function apiPlugin(fastify) {
    const apiHandler = new ApiHandler();

    fastify.decorate('api', apiHandler.api);
}

module.exports = fp(apiPlugin, { name: "api" })