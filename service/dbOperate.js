/**
 * des：操作用户数据库 user_info_kg_2 的服务
 * 
 */
var mysql = require('mysql');

//  数据库连接信息
var connetcObj = {
    host: 'localhost',
    user: 'root',
    password: 'abcd1234',
    port: '3306',
    database: 'chatbot_db'
}

// 数据库对象
// var connection = mysql.createConnection(connetcObj);

//  创建连接池
var pool = mysql.createPool(connetcObj);



/**
 * 
 * @param {*} sqlStatement , 待执行的sql 语句
 * @param {*} sqlVal ，sql 语句参数值
 * @param {*} callback 回调函数
 */
var executeSql = function (sqlStatement, sqlVal, callback) {
    // pool.getConnection(function (err, conn) {
    //     if (err) {
    //         callback(err, null, null);
    //     } else {
    //         conn.query(sqlStatement, sqlVal, function (err, results, fields) {
    //             //释放连接  
    //             conn.release();
    //             console.log('--------execute' + sqlStatement + '----------------------------------');
    //             //事件驱动回调  
    //             callback(err, results, fields);
    //         });
    //     }
    // });
    return new Promise(function (resolve, reject) {
        pool.getConnection(function (err, conn) {
            if (err) {
                reject(err);
            } else {
                conn.query(sqlStatement, sqlVal, function (err, results, fields) {
                    //释放连接  
                    conn.release();
                    console.log('--------execute' + sqlStatement + '----------------------------------');
                    console.log("exec result  =  " + results + "  error = " + err)
                    //事件驱动回调  
                    resolve(results);
                });
            }
        });
    });

};

/**
 * @description 通过用户查找用户
 * @param {*} userName 用户名
 * @returns user 对象，包括用户名，密码，是否删除
 */
var findUserByName = async function (userName) {
    let sqlStatement = "SELECT c_user.`user_id`, c_user.`name`,c_user.`password`,c_user.`is_deleted` FROM c_user WHERE c_user.`name`= '" + userName + "'";

    // executeSql(sqlStatement, null, function (err, result, fields) {
    //     console.log("-------------------select  user result:-------------")
    //     console.log(result)
    // })
    let result = await executeSql(sqlStatement, null)
    console.log("-------------------select  user result:-------------")
    console.log(result)
    return result

}

/**
 * @description 添加用户
 * @param {*} user 用户属性数组，包含userId,username,password,createTime
 */
var addNewUser = async function (user) {
    console.log("user = " + typeof (user))
    let sqlStatement = "INSERT INTO `chatbot_db`.`c_user` (   `user_id`,  `name`,  `password`)VALUES(?, ?, ?);"
    let result = await executeSql(sqlStatement, user)
    console.log("-------------------add  user result:-------------")
    console.log(result)
    return result
}


/**
 * @des 插入一条演员数据
 * @param {*} actorName 待插入演员数据
 * @param {*} callback 
 */
var insertActor = function (actorName, callback) {

    let sqlStatement = "INSERT INTO `user_info_kg_2`.`actor` (`actor_name`)\
            VALUES\
              ('" + actorName + "');\
              "
    executeSql(sqlStatement, null, function (err, result, fields) {
        // 插入 userlikeactor数据
        sqlStatement = "INSERT INTO `user_info_kg_2`.`user_like_actor` (`user_id`, `actor_id`)\
        VALUES\
          (1, " + result.insertId + ");"
        executeSql(sqlStatement, null, function (err2, result2, fields2) {

            callback(err, result)
        })


    })
};


/**
 * 
 * @param {*} actorName 待查询用户名
 * @param {*} callback 
 */
var queryActor = function (actorName, callback) {
    let sqlStatement = "SELECT `actor_id`, `actor_name` FROM `user_info_kg_2`.`actor` WHERE actor_name like '%" + actorName + "%'"
    executeSql(sqlStatement, null, function (err, result, fields) {
        callback(err, result)
    })
};


/**
 * @des 默认userid = 1 
 * @param {*} actorId 插入user to actor
 * @param {*} callback 
 */
var insertUserLikeActor = function (actorId, callback) {

    let sqlStatement = "INSERT INTO `user_info_kg_2`.`actor` (`actor_name`)\
            VALUES\
              ('" + actorName + "');\
              "
    executeSql(sqlStatement, null, function (err, result, fields) {
        callback(err, result)
    })
};


// module.exports.addData = addData;
module.exports.executeSql = executeSql;
module.exports.insertActor = insertActor;
module.exports.queryActor = queryActor;
module.exports.findUserByName = findUserByName;
module.exports.addNewUser = addNewUser;