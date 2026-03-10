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

module.exports = logger;