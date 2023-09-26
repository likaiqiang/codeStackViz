
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const {logger} = require("./log/index.js");
const {parseEnv} = require("./utils/server");

const {URL: url} = parseEnv()

const {hostname,port} = new URL(url)

const dev = (process.env.NODE_ENV || 'development') !== 'production'
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {

    logger.info('Server is starting...')

    const server = express();

    server.use(
        '/baidu', // 设置代理路径
        createProxyMiddleware({
            target: 'https://aip.baidubce.com', // 目标 API 地址
            changeOrigin: true, // 允许改变请求的原点，以便正确处理跨域请求
            // 可选：其他代理配置，例如修改请求头
            pathRewrite: {
                '^/baidu': '/' // 路径重写规则
            }
        })
    );

    server.get('*', (req, res) => {
        const parsedUrl = parse(req.url, true);
        handle(req, res, parsedUrl);
    });

    server.listen(port, async (err) => {
        if (err) {
            throw err;
        }
        logger.info(`> Ready on http://${hostname}:${port}`);
    });
})
