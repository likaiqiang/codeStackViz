const log4js = require('log4js')

// 配置 log4js
log4js.configure({
    appenders: {
        console: { type: 'console' }, // 将日志输出到控制台
        // file: { type: 'file', filename: 'app.log' } // 将日志输出到文件
    },
    categories: {
        default: { appenders: ['console'], level: 'info' } // 配置默认日志级别为 info
    }
});

module.exports = {
    logger: log4js.getLogger()
}
