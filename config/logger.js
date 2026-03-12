const { LoggingWinston } = require("@google-cloud/logging-winston");
const winston = require("winston");
const loggingWinston = new LoggingWinston();

const logger = winston.createLogger({
  level: 'info',
  transports: [
    new winston.transports.Console(),
    loggingWinston,
  ],
});

const errorLogger = (msgId, orgId) => {
    logger.log({
        level: 'error',
        message: `pubMessageId: ${msgId}`,
        org_id: orgId
    });
}


const infoLogger = (msg, orgId) => {
    logger.log({
        level: 'info',
        message: msg,
        org_id: orgId
    });
}

module.exports = {
    logger,
    errorLogger,
    infoLogger
};