var express = require('express');
// var http = require("http");
var url = require("url");
// var querystring = require('querystring');

var bodyParser = require('body-parser');

// 开启新线程,执行其他操作
var exec = require('child_process').exec;
var logger = require('morgan');

var session = require('express-session');

const http = require('http');
var path = require('path')

// 网络请求
var request = require('request');

var dbO = require('../service/dbOperate');

//从json文件中读取abi
var fs = require('fs');

var functions = require('../service/functions')
var LOG = require('../utils/logUtil')

var routes = require('./index');

var md5 = require("md5")


// var app = express();
var router = express.Router();

// 在app.use()中配置,无需每次请求中添加
//var urlencodedParser = bodyParser.urlencoded({ extended: false });
// var urlencodedParser = bodyParser.json();

///@dev 设置静态文件允许访问的文件夹
// app.use(express.static('public'));

// app.use(session({
//     secret: 'secret',
//     cookie: {
//         maxAge: 1000 * 60 * 30
//     }
// }));

// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({
//     extended: true
// }));

// ///@dev 设置日志类型为“development”模式
// app.use(logger('dev'));



// //allow custom header and CORS 解决跨域问题
// app.all('*', function (req, res, next) {
//     res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild');
//     res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

//     if (req.method == 'OPTIONS') {
//         res.send(200);
//     } else {
//         next();
//     }
// });


// // 将匹配 /register/+ <routes 中的路径>
// app.use('/', routes)


/**
 * nlp -- 自然语言经过nlp 模型，输出 操作的意图和参数
 * 使用意图和参数，使用kg模板查询
 *  
 *  user private kg查询api ： http://119.29.147.254:3030/kg_demo_movie?query=
 *  movie public kg查询api ： http://119.29.147.254:3131/moviekg?query=
 * 
 * model response :
 * {"subject":"user","entity":"mike jordan","state":"state","intent":"personName","perdicate":"hasLikeActor"}
 */
router.route('/queryTemplate').get(function (req, res) {

    var params = url.parse(req.url, true).query;
    if (params.content == '') {
        return res.send("error , no params,try again")
    }

    // 请求nlu服务
    // request('http://119.29.147.99:5000/kg_demo?content=?' + params.content, async function (error, response, body) {
    request('http://119.29.147.99:5001/kg_demo?content=?' + params.content, async function (error, response, body) {
        if (!error) {
            // nlu 之后的处理
            let userChatContent = params.content
            try {
                body = JSON.parse(body)
            } catch (error) {
                LOG("json parse error" + error)
            }

            LOG("model response boy", JSON.stringify(body))

            // 暂时只取单一值
            if (Array.isArray(body.subject)) {

                body = {
                    topic: body.topic.length == 0 ? "null" : body.topic[0],
                    subject: body.subject.length == 0 ? "null" : body.subject[0],
                    entity: body.entity.length == 0 ? "null" : body.entity[0],
                    state: body.state.length == 0 ? "null" : body.state[0],
                    intent: body.intent.length == 0 ? "null" : body.intent[0],
                    perdicate: body.perdicate.length == 0 ? "null" : body.perdicate[0]
                }
            } else {
                body = {
                    topic: body.topic.length == "" ? "null" : body.topic[0],
                    subject: body.subject == "" ? "null" : body.subject,
                    entity: body.entity == "" ? "null" : body.entity,
                    state: body.state == "" ? "null" : body.state,
                    intent: body.intent == "" ? "null" : body.intent,
                    perdicate: body.perdicate == "" ? "null" : body.perdicate
                }
            }

            // 临时处理
            body.intent = body.intent.replace(/user/, "person")
            body.perdicate = body.perdicate.replace(/user/, "person")
            // 保存用户每一句提问
            // functions.saveConversationData('"{' + new Date().getTime() + ':' + userChatContent + '}"').then((result) => {
            //     LOG("saveConContent result : " + result)
            // })

            functions.saveAllRelationalData(body)
            // model 返回的数据
            let resTempSuffix = '\n \n \n          - - - - - - - - - - - - - - - - - - - - - - - - - - - ' +
                ' \n model response : \n' + JSON.stringify(body)

            /* ***********根据model返回数据匹配查询模板******************* */
            if (body.topic.indexOf("movie") != -1 && body.subject.indexOf("others") != -1) {
                // topic = movie , subject = others
                // 对电影相关信息查询
                LOG("query about movie")

                functions.getMovieInfo(body).then((result) => {
                    // LOG("queryStatement", functions.expQueryStatement)
                    return res.json({
                        'data': {

                            'modelRes': body,
                            'naturalRes': result
                        },
                        'code': '200'
                    })
                })

            } else if (body.subject == "user" && body.state != "query" && body.intent != "greeting") {
                LOG("储存用户所有关系")
                //  subject = user ; topic != basic ; state != query
                // 储存用户所有数据和关系
                LOG("operating user data", null)
                // functions.operatingUserData(res, body)
                let storeState = await functions.saveAllRelationalData(body)
                if (storeState) {
                    return res.json({
                        'data': {

                            'modelRes': body,
                            'naturalRes': "i got it "
                        },
                        'code': '200'
                    })
                }
            } else if (body.subject == "user" && body.state == "query" && body.intent != "greeting") {
                LOG("查询用户某些关系数据")
                // 查询用户所有数据关系f
                let queryResult = await functions.queryAllRelationalData(body)
                LOG("queryAllRelationalData in queryEngine", queryResult)
                return res.json({
                    'data': {

                        'modelRes': body,
                        'naturalRes': queryResult
                    },
                    'code': '200'
                })

            } else if (body.topic == "basic" && body.intent === "greeting") {
                LOG("greeting")
                let chatArr = [
                    "hello", "Hi nice to meet you", "Hi, try telling me the actors you like.", "Hi, try to test my memory."
                ]

                return res.json({
                    'data': {
                        'modelRes': body,
                        'naturalRes': chatArr[Math.floor(Math.random() * chatArr.length)]
                    },
                    'code': '200'
                })
                // res.send(chatArr[Math.floor(Math.random() * chatArr.length)] + resTempSuffix)
            } else if (body.topic == "basic" && body.subject === "chatbot" && body.state == "query") {
                // 查询机器人信息
                let botInfo = functions.getBotInfo(body)

                return res.json({
                    'data': {

                        'modelRes': body,
                        'naturalRes': botInfo
                    },
                    'code': '200'
                })
                // res.send("I am still stupid now, ask some simple \n" + resTempSuffix)
            } else {
                // 无法回答的响应
                return res.json({
                    'data': {

                        'modelRes': body,
                        'naturalRes': "I am still stupid now, ask some simple"
                    },
                    'code': '200'
                })
                // res.send("I am still stupid now, ask some simple \n" + resTempSuffix)
            }
        } else {
            // nlu 服务响应出错
            return res.json({
                'data': {

                    'modelRes': "error",
                    'naturalRes': "server error"
                },
                'code': '200'
            })
        }
    })
});


/**
 * login
 * path.resolve(__dirname, '..') 参数一：当前文件所在路径，参数二：返回上一级
 * 
 */
router.route('/login').get(function (req, res) {
    res.sendFile(path.resolve(__dirname, '..') + "/public/" + "login.html");
}).post(async function (req, res) {
    let userName = req.body.uname;
    let password = req.body.upwd;
    password = md5(password)
    LOG("login data", req.body)
    let user = await dbO.findUserByName(userName)
    let string = JSON.stringify(user);
    let data = JSON.parse(string)
    LOG("login user ", data)
    if (string == '[]' || data[0].password != password) {
        res.sendFile(path.resolve(__dirname, '..') + "/public/" + "login.html");
    } else {
        LOG("成功登录，跳转index")
        functions.upDateUserId(data[0].user_id)
        req.session.user = data[0]
        res.sendFile(path.resolve(__dirname, '..') + "/public/" + "index.html");
    }
})


/**
 * register
 */
router.route("/register").get(function (req, res) {
    res.sendFile(path.resolve(__dirname, '..') + "/public/" + "register.html");
}).post(async function (req, res) {
    let userName = req.body.uname;
    let password = req.body.upwd;
    password = md5(password)
    let user = await dbO.findUserByName(userName)
    let string = JSON.stringify(user);
    // 数据库不存在该用户
    if (string == '[]') {
        // 新建一个kg中的用户
        let kgUser = await functions.addNewUser()
        LOG("kg user ", kgUser)
        let user = [
            kgUser, userName, password
        ]
        let addRes = dbO.addNewUser(user)
        if (addRes != undefined) {
            res.sendFile(path.resolve(__dirname, '..') + "/public/" + "login.html");
        } else {
            res.sendFile(path.resolve(__dirname, '..') + "/public/" + "register.html");
        }
    } else {
        res.sendFile(path.resolve(__dirname, '..') + "/public/" + "register.html");
    }
});



/**
 * @description 保存用户纠正model输出的数据
 */
// app.post("/correctModelOutput", urlencodedParser, function (req, res) {
router.route('/correctModelOutput').post(function (req, res) {

    let returnData = req.body;
    console.log("server get data " + JSON.stringify(req.body))
    functions.saveUserCorrectedData(returnData)
    res.send("200")
})


router.route('/home').get(async function (req, res) {
    res.sendFile(path.resolve(__dirname, '..') + "/public/" + "home.html");
})


/**
 * @description 添加一个用户
 */
router.route('addNewUser').get(async function (req, res) {
    res.send(await functions.addNewUser() + " ")
})


module.exports = router;

/**
 * @description 默认主页
 */
// app.get('*', function (req, res) {
//     res.sendFile(__dirname + "/public/" + "home.html");
// })


// app.set('port', 8282)
// var server = http.createServer(app)

// server.listen(8282, function () {

//     var host = server.address().address
//     var port = server.address().port
//     console.log("nodejs服务已启动，访问地址： http://" + host + ":" + port)

// })

/**
 * @description start server
 */
// var server = app.listen(8282, function () {

//     var host = server.address().address
//     var port = server.address().port
//     console.log("nodejs服务已启动，访问地址： http://" + host + ":" + port)

// })