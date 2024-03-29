
const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const {logger} = require("./log/index.js");
const {parseEnv} = require("./utils/server");

const {URL: url} = parseEnv()

const {hostname,port} = new URL(url)

const dev = (process.env.NODE_ENV || 'development') !== 'production'
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {

    logger.info('Server is starting...')

    createServer((req, res) => {
        const parsedUrl = parse(req.url, true)
        handle(req, res, parsedUrl)
    }).listen(port, async (err) => {
        if (err) {
            throw err
        }
        logger.info(`> Ready on http://${hostname}:${port}`)
    })
})
