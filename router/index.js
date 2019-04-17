var express = require('express');
var router = express.Router();
// var bodyParser = require('body-parser');
// var urlencodedParser = bodyParser.json();



/* GET register page. */
router.route("/register").get(function (req, res) {
    console.log("---dirname--- " + __dirname)
    res.sendFile("D:/Astromind/chatbot_modeProcess/public/" + "register.html");
}).post(function (req, res) {
    //这里的User就是从model中获取user对象，通过global.dbHandel全局方法（这个方法在app.js中已经实现)

});


module.exports = router;