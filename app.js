require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let mongoose = require('mongoose');
var cors = require('cors');
var dns = require('dns');
var dnsPromises = dns.promises;

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
const { env } = require('process');

var app = express();

// Parse CORS origins (comma-separated string to array)
const corsOrigins = env.CORS_ORIGIN 
  ? env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/', indexRouter);
//localhost:3000/users
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/roles', require('./routes/roles'));
app.use('/api/v1/products', require('./routes/products'))
app.use('/api/v1/categories', require('./routes/categories'))
app.use('/api/v1/auth', require('./routes/auth'))
app.use('/api/v1/carts', require('./routes/cart'))
app.use('/api/v1/favorites', require('./routes/favorites'))
app.use('/api/v1/upload', require('./routes/upload'))
app.use('/api/v1/messages', require('./routes/messages'))
app.use('/api/v1/orders', require('./routes/orders'))

if (process.env.FORCE_GOOGLE_DNS === 'true') {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
  dnsPromises.setServers(['1.1.1.1', '8.8.8.8']);
}

mongoose.connect(env.MONGO_URI || 'mongodb://localhost:27017/NNPTUD-C4');
mongoose.connection.on('connected', function () {
  console.log("connected");
})
mongoose.connection.on('disconnected', function () {
  console.log("disconnected");
})
mongoose.connection.on('disconnecting', function () {
  console.log("disconnecting");
})
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.send(err.message);
});

module.exports = app;
