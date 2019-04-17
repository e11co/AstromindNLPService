var express = require('express');
var bodyParser = require('body-parser');
// 开启新线程,执行其他操作
// var exec = require('child_process').exec;
var logger = require('morgan');
var session = require('express-session');
var path = require('path')
// const http = require('http');
// 网络请求
// var request = require('request');
// var db = require('./dbOperate');
//从json文件中读取abi
// var fs = require('fs');
var LOG = require('./utils/logUtil')
// var routes = require('./router/index');
var queryEngine = require('./router/queryEngine');

var app = express();

// 在app.use()中配置,无需每次请求中添加
//var urlencodedParser = bodyParser.urlencoded({ extended: false });
// var urlencodedParser = bodyParser.json();

///@dev 设置静态文件允许访问的文件夹
app.use(express.static('public'));

app.use(session({
    secret: 'secret',
    cookie: {
        maxAge: 1000 * 60 * 30
    }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

///@dev 设置日志类型为“development”模式
app.use(logger('dev'));



//allow custom header and CORS 解决跨域问题
app.all('*', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
    res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

    if (req.method == 'OPTIONS') {
        res.send(200);
    } else {
        next();
    }
});

/**
 * 未登录拦截
 */
app.get('*', function (req, res, next) {
    LOG("req filter", req.url);
    LOG("session =", req.session.user)
    if (req.url.indexOf('/queryTemplate') != -1) {
        next();
    } else if (req.url != '/login' && req.url != '/register') {
        if (req.session.user == undefined) {

            res.sendFile(__dirname + "/public/" + "login.html");
        } else {
            next()
        }
        LOG("type of session user", typeof (req.session.user)) // ok
    } else if (req.session.user == undefined) {
        next();
    } else {
        res.sendFile(__dirname + "/public/" + "home.html");
    }

})


// 将匹配 /register/+ <routes 中的路径>
// app.use('/', routes)
app.use('/', queryEngine)


/**
 * @description 默认主页
 */
app.get('*', function (req, res) {
    res.sendFile(__dirname + "/public/" + "login.html");
})

/**
 * @description start server
 */
var server = app.listen(8282, function () {

    var host = server.address().address
    var port = server.address().port
    console.log("nodejs服务已启动，访问地址： http://" + host + ":" + port)

})