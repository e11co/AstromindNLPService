/*
 * @Description: 查询kg的方法
 * @Author: Jon
 * @LastEditors: Please set LastEditors
 * @Date: 2019-02-20 11:11:37
 * @LastEditTime: 2019-02-22 11:28:45
 */
/* WEBHOOK DOREMUS FUNCTIONS */

var exec = require('child_process').exec;
const request = require('request');
const uuidv3 = require('uuid/v3');
const LOG = require('../utils/logUtil');

var mysql = require('mysql');

// 默认用户
var globelUserId = "1"

//  数据库连接信息
var connetcObj = {
    host: 'localhost',
    user: 'root',
    password: 'abcd1234',
    port: '3306',
    database: 'user_corrected_data'
}


//  创建连接池
var pool = mysql.createPool(connetcObj);

// 查询的前缀 -- 已编码
const queryPrefix = 'http://119.29.147.254:3131/moviekg?query=' +
    'PREFIX+%3A+%3Chttp%3A%2F%2Fwww.e11.co%2Fmoviekg%23%3E%0APREFIX+rdf%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%3E%0APREFIX+xsd%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23%3E%0APREFIX+owl%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2002%2F07%2Fowl%23%3E%0APREFIX+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0A%0A'
const userQueryPrefix = 'http://119.29.147.254:3030/kg_demo_movie?query=' +
    'PREFIX+rdf%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F1999%2F02%2F22-rdf-syntax-ns%23%3E%0APREFIX+rdfs%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2000%2F01%2Frdf-schema%23%3E%0APREFIX+owl%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2002%2F07%2Fowl%23%3E%0APREFIX+xsd%3A+%3Chttp%3A%2F%2Fwww.w3.org%2F2001%2FXMLSchema%23%3E%0APREFIX+%3A+%3Chttp%3A%2F%2Fwww.e11.co%2Fuserkg%23%3E%0A%0A'

const querySuffix = '&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on';



/**
 * @description: 查询某个电影的信息，如该电影类型，评分，演员...
 * @param {type} response: http响应对象
 * @return: 返回一个包含处理结果的promise
 */
module.exports.getMovieInfo = function getMovieInfo(modelRes) {

    let sendInfo
    // let resTempSuffix = '\n \n \n          - - - - - - - - - - - - - - - - - - - - - - - - - - - ' +
    //     ' \n model response : \n' + JSON.stringify(modelRes)

    var newQuery = 'SELECT DISTINCT ?' + modelRes.intent + ' ?introduction  \
    WHERE {  ?movie a :Movie . '

    // ?movie :movieIntroduction ?introduction .
    // 查询判断
    if (modelRes.perdicate.indexOf('movieRate') != -1) {
        // movie评分查询
        // modelRes.perdicate = "movieRating"

        // 查询语句拼接
        newQuery += '?movie :movieTitle ?title .\
        ?movie :movieRating ?' + modelRes.intent + ' .\
            FILTER regex(?title, "' + modelRes.entity + '", "i") .\
             '
    } else if (modelRes.perdicate.indexOf('hasMovieGenre') != -1) {
        // 查询电影类型,给我一些xx类型的电影(评分高于6)
        newQuery += "?movie :hasGenre ?genre ; :movieTitle ?" + modelRes.intent + " . \
        ?genre :genreName ?gName .\
        FILTER regex(?gName,'" + modelRes.entity + "','i') .\
        ?movie :movieRating ?rating .\
        FILTER (?rating > 6) .\
      "
    } else if (modelRes.intent.indexOf('personName') != -1) {
        // 查询电影的演员
        newQuery += "?movie :movieTitle  ?movieTitle . \
        ?actor a :Person . \
        ?actor :hasActedIn ?movie . \
         ?actor :personName ?" + modelRes.intent + " . \
         FILTER regex(?movieTitle, '" + modelRes.entity + "', 'i') . \
        "
    }


    newQuery += ' ?movie :movieIntroduction ?introduction . } LIMIT 6'

    LOG("get movie info query statement : ", newQuery)

    let finalQuery = queryPrefix + encodeURI(newQuery) + querySuffix;


    // -> Do the HTTP request

    return new Promise(function (resolve) {
        if (modelRes.state != 'query') {
            return resolve('sorry , the match is wrong')
        }

        request(finalQuery, (err, res, body) => {
            let bodyJson
            if (typeof (body) == "string") {

                try {
                    bodyJson = JSON.parse(body);
                } catch (error) {
                    console.log(error)
                }

                LOG("get movie info response : ", body)
            }
            if (bodyJson["results"]["bindings"].length === 0) {
                sendInfo = "i dont know";
            } else {

                let resValue = ""
                // if (modelRes.intent == "movieTitle") {
                //     resValue += bodyJson["results"]["bindings"][0]["movieTitle"]["value"] + '\n'
                // } else if (modelRes.intent == "movieRate") {
                //     resValue += bodyJson["results"]["bindings"][0]["movieRate"]["value"] + '\n'
                // } else if (modelRes.intent == "personName") {
                //     resValue += bodyJson["results"]["bindings"][0]["personName"]["value"] + '\n'
                // }

                for (let index = 0; index < bodyJson["results"]["bindings"].length; index++) {
                    resValue += bodyJson["results"]["bindings"][index][modelRes.intent]["value"] + ' ; '
                }

                // resValue += " \n \n This movie is about: \n" + bodyJson["results"]["bindings"][0]["introduction"]["value"]

                resTemp = 'The ' + modelRes.entity + ' ' + modelRes.intent + ' : ' + resValue

                // return response.end(resTemp + resTempSuffix)
                sendInfo = resTemp;
            }
            return resolve(sendInfo)
        });
    })
};


/**
 * @description: 查询某个实体在知识图谱中的id,不存在则储存，实体包括：user、actor、movie、movie_genre
 * @param {type} entityName: 实体名称 (user、actor、movie、movie_genre)
 * @param {type} entityValue: 实体值
 * @return:  entityId   -1 // entityName 有误
 *                      -2 // 暂不支持添加新用户
 *                      -3 // 添加数据执行时失败 
 */
// module.exports.getEntityId = function getEntityId(entityName, entityValue) {
//     // 
//     let entityId = 0;

//     // 首字母转为大写
//     let entitiyNameUpperCase = entityName.replace(/\b\w+\b/g, function (word) {
//         return word.substring(0, 1).toUpperCase() + word.substring(1);
//     })
//     console.log("------UpperCase-------")
//     console.log(entitiyNameUpperCase)
//     let newQuery = 'SELECT ?' + entityName + ' \
//                     WHERE {\
//                     ?' + entityName + ' a :' + entitiyNameUpperCase + ' ;\
//                     :' + entityName + 'Name ?name .\
//                     FILTER regex(?name, "' + entityValue + '", "i")\
//                     } '

//     let finalQuery = userQueryPrefix + encodeURI(newQuery) + querySuffix;

//     // let queryResult = false;

//     return new Promise(function (resolve) {
//         // 执行语句
//         request(finalQuery, function (err, res, body) {
//             LOG("body", body)
//             // TODO body的异常处理
//             let bodyJson = JSON.parse(body);
//             let resValue
//             if (bodyJson["results"]["bindings"].length === 0) {
//                 // 图谱中没有 该数据，储存该entityValue
//                 // TODO

//                 let newData;
//                 entityId = uuidv3(entityValue, uuidv3.DNS);
//                 switch (entityName) {
//                     case 'user':
//                         entityId = -2; // 暂不支持添加新用户
//                         resolve(entityId)
//                         break;
//                     case 'actor':
//                         newData = "<file:///home/cancer/astromind/download/apache-jena-3.6.0/user_info.nt#actor/" + entityId + "> \
//                     a           :Actor ; \
//                     :actorName  \"" + entityValue + "\" . "
//                         break;
//                     case 'movie':
//                         newData = "<file:///home/cancer/astromind/download/apache-jena-3.6.0/user_info.nt#movie/" + entityId + "> \
//                         a           :Movie ; \
//                         :movieName  \"" + entityValue + "\" . "
//                         break;
//                     case 'movie_genre':
//                         newData = "<file:///home/cancer/astromind/download/apache-jena-3.6.0/user_info.nt#movie_genre/" + entityId + "> \
//                         a           :MovieGenre ; \
//                         :movieGenreName  \"" + entityValue + "\" . "
//                         break;
//                     default:
//                         entityId = -1; // entityName 有误
//                         resolve(entityId)
//                         break;
//                 }

//                 LOG("newData", newData)

//                 // let state = await updateGraph(newData);
//                 updateGraph(newData).then(function (state) {
//                     if (state) {
//                         LOG("entityID in updateGraph function when state = true", entityId)
//                         resolve(entityId)
//                     } else {
//                         LOG("entityID in updateGraph function when state = false", entityId)
//                         entityId = -3 // 添加数据执行时失败 
//                         resolve(entityId)
//                     }
//                 })

//             } else {
//                 // 图谱已存在该数据，返回Id
//                 switch (entityName) {
//                     case 'user':
//                         resValue = bodyJson["results"]["bindings"][0]["user"]["value"]
//                         break;
//                     case 'actor':
//                         resValue = bodyJson["results"]["bindings"][0]["actor"]["value"]
//                         break;
//                     case 'movie':
//                         resValue = bodyJson["results"]["bindings"][0]["movie"]["value"]
//                         break;
//                     case 'movie_genre':
//                         resValue = bodyJson["results"]["bindings"][0]["movie_genre"]["value"]
//                         break;
//                     default:
//                         entityId = -1; // entityName 有误
//                         resolve(entityId)
//                         break;
//                 }
//                 let splitArr = resValue.split('/');
//                 entityId = splitArr[splitArr.length - 1];
//                 LOG("entityID", entityId)
//                 resolve(entityId)
//             }
//         })
//     });
// }


/**
 * @description: 对用户数据的操作，储存用户数据，查询用户数据
 * @param {type} modelRes nlu模型返回数据
 * @param {type} response 请求响应对象
 * @return: 
 */
// module.exports.operatingUserData = async function operatingUserData(response, modelRes) {
//     let resTempSuffix = '\n \n \n       - - - - - - - - - - - - - - - - - - - - - - - - - ' +
//         ' \n model response : \n' + JSON.stringify(modelRes)
//     let resStatement = "";
//     /**
//      * 保存用户喜爱演员数据
//      */

//     if (modelRes.perdicate == "hasLikeActor" && modelRes.state != "query" && modelRes.intent.indexOf("movie") == -1) {
//         /**
//          * 记忆用户喜欢的演员
//          * 1. 查询图谱中是否存在该演员，不存在，先进行储存，返回该演员ID，存在，返回该演员ID
//          * 2.  添加该演员ID为用户喜爱的演员
//          */
//         let entityId = await this.getEntityId('actor', modelRes.entity)
//         LOG("entityId in operatingUserData()", entityId)
//         LOG("entityId tpye", typeof (entityId))
//         if (typeof (entityId) == "string") {
//             let state = await this.addLikeActor(entityId)
//             if (state) {

//                 return response.json({
//                     'data': {

//                         'modelRes': modelRes,
//                         'naturalRes': "i got it"
//                     },
//                     'code': '200'
//                 })
//                 // return response.send("i got it" + resTempSuffix)
//             } else {
//                 return response.json({
//                     'data': {

//                         'modelRes': modelRes,
//                         'naturalRes': "store error"
//                     },
//                     'code': '200'
//                 })
//                 // return response.send("store error" + resTempSuffix)
//             }
//         } else {
//             return response.json({
//                 'data': {

//                     'modelRes': modelRes,
//                     'naturalRes': "entityId type error"
//                 },
//                 'code': '200'
//             })
//             // return response.send("store error " + resTempSuffix)
//         }
//     } else if (modelRes.state == "query") {
//         /**
//          * 对用户记忆进行查询
//          */
//         LOG('对用户记忆进行查询', null)
//         let queryRes = await this.queryUserMemory(modelRes)

//         return response.json({
//             'data': {

//                 'modelRes': modelRes,
//                 'naturalRes': queryRes + ' I remember right?'
//             },
//             'code': '200'
//         })
//         // return response.send(queryRes + "\n I remember right?" + resTempSuffix)

//     } else {
//         // 其他情况
//         resStatement = " I know that you like  " + modelRes.entity
//         return response.json({
//             'data': {

//                 'modelRes': modelRes,
//                 'naturalRes': resStatement
//             },
//             'code': '200'
//         })
//     }
// }


/**
 * @description: 从用户记忆数据中查询
 * @param {type} 
 * @return: 
 */
// module.exports.queryUserMemory = async function queryUserMemory(modelRes) {
//     let resTempSuffix = '\n \n \n          - - - - - - - - - - - - - - - - - - - - - - - - - - - ' +
//         ' \n model response : \n' + JSON.stringify(modelRes)

//     /**
//      * 目前仅针对haslikeactor进行查询
//      */
//     let queryFlag = "favoriteActor"
//     var queryResult = ""

//     var newQuery;
//     switch (queryFlag) {
//         case "favoriteActor":
//             newQuery = 'SELECT DISTINCT  ?likeActorName   \
//                     WHERE { \
//                     ?user a :User ;\
//                         :userName "Jon" ;\
//                     :hasLikeActor  ?likeActor .\
//                     ?likeActor :actorName ?likeActorName .\
//                     }  '
//             break;
//         case "favoriteMovie":
//             newQuery = 'SELECT DISTINCT  ?likeMovieName   \
//                             WHERE { \
//                             ?user a :User ;\
//                                 :userName "Jon" ;\
//                             :hasLikeMovie ?likeMovie .\
//                             ?likeMovie :movieName ?likeMovieName .\
//                             }  '
//             break;
//         default:
//             break;
//     }

//     LOG("用户记忆查询", newQuery)

//     var finalQuery = userQueryPrefix + encodeURI(newQuery) + querySuffix;


//     return new Promise(function (resolve) {
//         // -> Do the HTTP request
//         request(finalQuery, (err, res, body) => {
//             let bodyJson
//             try {
//                 bodyJson = JSON.parse(body);
//             } catch (error) {
//                 console.log(error)
//             }
//             if (bodyJson["results"]["bindings"].length === 0) {
//                 queryResult = "You haven't told me what you like."
//             }
//             if (queryFlag === "favoriteActor") {
//                 let resArr = bodyJson["results"]["bindings"]
//                 for (let index = 0; index < resArr.length; index++) {
//                     queryResult += resArr[index].likeActorName.value;
//                     if (index < resArr.length - 1) {
//                         queryResult += ","
//                     }
//                 }
//                 LOG("queryResult is", queryResult)

//             } else if (queryFlag === "favoriteMovie") {
//                 // TODO 模型返回值还不准确
//             }

//             resolve(queryResult)
//         });
//     })
// }


/**
 * @description 向用户默认图更新数据的执行函数 
 * @param {*} newGraphData 新的图数据 格式： <file:///home/cancer/astromind/download/apache-jena-3.6.0/user_info.nt#actor/11> \
                                                a           :Actor ;\
                                                :actorName   '" + params.actor + "' .
   @returns state 执行成功返回true ， 否则返回false
 */
function updateGraph(newGraphData) {

    let state = true
    // 执行shell脚本
    let getGraphCmd = '/home/cancer/astromind/kg_demo/apache-jena-fuseki-3.6.0/bin/s-get http://localhost:3030/kg_demo_movie/get default > /home/cancer/astromind/kg_demo/apache-jena-fuseki-3.6.0/bin/graph2.ttl  && echo \'' + newGraphData + '\' >> /home/cancer/astromind/kg_demo/apache-jena-fuseki-3.6.0/bin/graph2.ttl  && /home/cancer/astromind/kg_demo/apache-jena-fuseki-3.6.0/bin/s-put http://119.29.147.254:3030/kg_demo_movie/data default  /home/cancer/astromind/kg_demo/apache-jena-fuseki-3.6.0/bin/graph2.ttl '

    LOG("getGraphCmd in  updateGraph , 执行更改默认图谱的数据", getGraphCmd)

    return new Promise(function (resolve) {
        exec(getGraphCmd, function (err, stdout, stderr) {
            if (err) {
                console.log('exec cmd error:' + stderr);
                state = false
            } else {
                console.log("exec cmd success")
            }
            resolve(state);
        });
    });
}


/**
 * @description 将对话数据保存至知识图谱
 * @param userChatContent 暂时仅记录用户的问题，Json格式{"date","content"}
 * @returns promis
 */
module.exports.saveConversationData = function saveConversationData(userChatContent) {

    let newConData = '<file:///home/cancer/astromind/download/apache-jena-3.6.0/user_info.nt#userChatRecord/1> \
    a             :UserChatRecord ; \
    :chatContent  ' + userChatContent + ' . '

    return new Promise(function (resolve) {
        LOG("saveConData newData", newConData)
        updateGraph(newConData).then((result) => {
            LOG("saveConersationData status", result)
            resolve(result)
        })
    });
}



/**
 * @description 保存所有关系 spo 知识图谱中不存在的关系也会新建并保存
 * @param modelRes 模型输出结果
 * @returns promis
 */
module.exports.saveAllRelationalData = function saveAllRelationalData(modelRes) {
    LOG('kg user ', globelUserId)
    if (modelRes.entity != "null") {
        // entity 存在
        // 新建 属性
        let newPerdicate = ':' + modelRes.perdicate + '  a         owl:DatatypeProperty , rdf:Property ; \
        rdfs:domain  :User ; \
        rdfs:range   xsd:string .'

        let newValue = '  <file:///home/cancer/astromind/download/d2rq/user_info.nt#user/' + globelUserId + '> \
        a                   :User ; \
        :' + modelRes.perdicate + '       "' + modelRes.entity + '" .'

        let finalData = newPerdicate + newValue;

        return new Promise(function (resolve) {
            LOG("saveConData newData", finalData)
            updateGraph(finalData).then((result) => {
                LOG("saveAllRelationalData status", result)
                resolve(result)
            })
        });
    } else {
        LOG("saveAllRelationalData fail, no entity")
        return false

    }
}


/**
 * @description 查询用户的所有关系
 * @param modelRes 模型输出结果
 * @returns promis
 */
module.exports.queryAllRelationalData = function queryAllRelationalData(modelRes) {

    if (modelRes.perdicate != "null" && modelRes.state === "query") {
        // state = query
        LOG('kg user ', globelUserId)
        let newQuery = 'SELECT DISTINCT  ?' + modelRes.intent + ' WHERE { ?user a :User ; :userId "' + globelUserId + '" . ?user :' + modelRes.perdicate + ' ?' + modelRes.intent + ' .} '


        var finalQuery = userQueryPrefix + encodeURI(newQuery) + querySuffix;

        LOG("query alll relational finalQueryStatement : ", finalQuery)

        return new Promise(function (resolve) {
            if (modelRes.state != 'query') {
                return resolve('sorry , the match is wrong')
            }

            request(finalQuery, (err, res, body) => {
                let bodyJson
                LOG("body type : ", typeof (body))
                LOG("body content", body)
                if (typeof (body) != 'object') {
                    try {
                        bodyJson = JSON.parse(body);
                    } catch (error) {
                        console.log(error)
                    }
                } else {
                    bodyJson = body;
                }
                if (bodyJson["results"]["bindings"].length === 0) {
                    // sendInfo = "i dont know";
                    return resolve("I don't know this, can you tell me?")
                } else {

                    let resValue = ""

                    for (let index = 0; index < bodyJson["results"]["bindings"].length; index++) {

                        resValue += bodyJson["results"]["bindings"][index][modelRes.intent]["value"] + " "
                    }

                    resValue = 'It is ' + resValue

                    // return response.end(resTemp + resTempSuffix)
                    return resolve(resValue)
                }
            });

        })
    }
}


/**
 * @description 保存用户纠正后的数据 至mysql 
 * @param userChatContent 暂时仅记录用户的问题，Json格式{"date","content"}
 * @returns promis
 */
module.exports.saveUserCorrectedData = function saveUserCorrectedData(userCorrectedData) {

    let addSql = "INSERT INTO `user_corrected_data`.`new_data` ( `user_id`,`question`,`corrected_data`) VALUES ( ?, ?, ? );"

    // let addSqlParams = ['1', 'new question', '{"intent":"newIntent","entity":"newEntity"}']
    let addSqlParams = ['1', userCorrectedData.question, JSON.stringify(userCorrectedData.userCorrectedData)]

    console.log(addSqlParams)
    return new Promise(function (resolve) {
        pool.getConnection(function (err, conn) {

            conn.query(addSql, addSqlParams, function (err, result) {
                if (err) {
                    console.log('[INSERT ERROR] - ', err.message);
                    return;
                }
                conn.release();

                console.log('--------------------------INSERT----------------------------');
                //console.log('INSERT ID:',result.insertId);        
                console.log('INSERT ID:', result);
                console.log('-----------------------------------------------------------------\n\n');
            });
        })

    });
}


/**
 * @description 添加一个新的用户
 * @returns promise 添加成功 true，添加失败 false
 */
module.exports.addNewUser = function addNewUser() {

    let userId = uuidv3(new Date().getTime() + " ", uuidv3.DNS);

    // 更改操作的用户
    globelUserId = userId;

    let newUser = '<file:///home/cancer/astromind/download/d2rq/user_info.nt#user/' + userId + '>    a          :User ;    :userId    "' + userId + '"  .'

    return new Promise(function (resolve) {
        LOG("addNewUser newUser", newUser)
        updateGraph(newUser).then((result) => {
            LOG("addNewUser status", result)
            // resolve(result)
            resolve(userId)
        })
    });
}



/**
 * @description 查询机器人的信息
 * @returns promise  
 */
module.exports.getBotInfo = function getBotInfo(modelRes) {

    let response = ""
    switch (modelRes.perdicate) {
        case "personBirthDay":
            response += "my birthday is 2018.06.06"
            break;

        case "personName":
            response += "my name is  Astromind"
            break;

        case "personConstellation":
            response += "my horoscope is Sagittarius"
            break;
        case "hasLikeMovieGenre":
            response += "i like horror movie"
            break;
        default:
            response += "null"
            break;
    }
    return response
}

/**
 * 更新kg user 
 */
module.exports.upDateUserId = function upDateUserId(userId) {
    LOG('kg user  userId ', userId)
    globelUserId = userId;
}