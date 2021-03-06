'use strict';

const GET = 'GET';
const POST = 'POST';

const fs = require('fs');
const path = require('path');

const Router = require('koa-router');
const koaCors = require('koa2-cors');
const _router = new Router();

const config = require('../../config');
const initGenerator = require('../lib/init-generator');
const api = require('./api');
const util = require('./util');
const ossPrefix = `${config.ossPublic.domainPrefix}/${config.ossPublic.staticFolder}`;
const staticVersion = config.ossPublic.staticVersion;

//  前端将使用 react ，网站采用 SPA 模式，固定模板页面，设定路由列表
const routeList = [
    '/',
    '/catalogue',
    '/catalogue/:filterType/:filterParam',
    '/paper/:paperId',
    '/user/:uuid',
    '/util/activate/:uuid',
    '/admin/add-paper',
    '/admin/edit-paper/:paperId',
];
const cors = config.env === 'development';
const apiList = [
    /* util */
    ['/util/upload-file', cors, POST, util.uploadFile],

    // User
    ['/api/user/default', cors, GET, api.user.getUserDefault],
    ['/api/user/login',cors, POST, api.user.login],
    ['/api/user/logout', cors, POST, api.user.logout],
    ['/api/user/register', cors, POST, api.user.register],
    ['/api/user/activate', cors, POST, api.user.activate],
    ['/api/user/update-info', cors, POST, api.user.updateInfo],
    ['/api/user/update-pwd', cors, POST, api.user.updatePwd],
    ['/api/user/reset-pwd', cors, POST, api.user.resetPwd],
    ['/api/user/send-activate-mail', cors, POST, api.user.sendActivateMail],

    // Message
    ['/api/message/page', cors, GET, api.message.page],

    // Paper
    ['/api/paper/filter-count', cors, GET, api.paper.filterCount],
    ['/api/paper/:paperId', cors, GET, api.paper.findOne],

    // Catalogue
    ['/api/catalogue/page', cors, GET, api.catalogue.page],

    // Reply
    ['/api/reply', cors, GET, api.reply.findMany],
    ['/api/reply/create', cors, POST, api.reply.create],
    ['/api/reply/:replyId/update', cors, POST, api.reply.update],
    ['/api/reply/:replyId/delete', cors, POST, api.reply.delete],

    // Admin
    ['/api/admin/paper/create', cors, POST, api.admin.createPaper],
    ['/api/admin/paper/:paperId/update', cors, POST, api.admin.updatePaper],
];

routeList.forEach(routeLink => {
    _router.get(routeLink, async function(ctx, next) {
        const adminReg = /^\/admin/;
        const catalogueFilterReg = /^\/catalogue\/(tag|timeline)/;
        const reqUrl = ctx.request.url;
        const filePath = path.resolve(__dirname, '../template/index.html');
        const cacheTag = (process.env.NODE_ENV === 'production') ? '' : `?${Date.parse(new Date())}`;
        const {
            seoData = '',
            initData = ''
        } = await initGenerator(ctx, routeLink);
        var data = fs.readFileSync(filePath).toString();

        data = data.replace(/<seoData>/g, seoData);
        data = data.replace(/<initData>/g, initData);

        if (adminReg.test(reqUrl)) {
            const user = ctx.session.user || {};
            const isOwner = ctx.session.isOwner;

            if (!isOwner || !user.uuid) {
                ctx.status = 404;
                ctx.message = 'Not Found';

                await next();
            } else {
                data = data.replace(/<cacheTag>/g, cacheTag);
                data = data.replace(/<ossPrefix>/g, ossPrefix);
                ctx.body = data.replace(/<staticVersion>/g, staticVersion);
            }
        } else if (routeLink === '/catalogue/:filterType/:filterParam' && !catalogueFilterReg.test(reqUrl)) {
            ctx.status = 404;
            ctx.message = 'Not Found';

            await next();
        } else {
            data = data.replace(/<cacheTag>/g, cacheTag);
            data = data.replace(/<ossPrefix>/g, ossPrefix);
            ctx.body = data.replace(/<staticVersion>/g, staticVersion);
        }
    });
});
apiList.forEach(apiItem => {
    if (apiItem[1]) {
        switch(apiItem[2]) {
        case GET:
            _router.get(apiItem[0], koaCors(), apiItem[3]);
            break;
        case POST:
            _router.post(apiItem[0], koaCors(), apiItem[3]);
            break;
        default:
            // do nothing
        }
    } else {
        switch(apiItem[2]) {
        case GET:
            _router.get(apiItem[0], apiItem[3]);
            break;
        case POST:
            _router.post(apiItem[0], apiItem[3]);
            break;
        default:
            // do nothing
        }
    }
});

module.exports = _router;