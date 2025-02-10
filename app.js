var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var tokopediaRouter = require('./routes/tokopedia');
var lazadaRouter = require('./routes/lazada');
var blibliRouter = require('./routes/blibli');

var orderRouter = require('./routes/module/order');
var channelRouter = require('./routes/module/channel');
var chatRouter = require('./routes/module/chat');
var productRouter = require('./routes/module/product');
var storeRouter = require('./routes/module/store');
var crmRouter = require('./routes/module/crm');

var app = express();
// require('dotenv').config()
// var port = 3001;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
// app.listen(port, function () {
//   console.log('Example app listening on port ' + port + '!');
// });

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api/v1/tokopedia', tokopediaRouter);
app.use('/api/v1/lazada', lazadaRouter);
app.use('/api/v1/blibli', blibliRouter);

app.use('/api/v1/orders', orderRouter);
app.use('/api/v1/channels', channelRouter);
app.use('/api/v1/chats', chatRouter);
app.use('/api/v1/products', productRouter);
app.use('/api/v1/stores', storeRouter);
app.use('/api/v1/crm', crmRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
