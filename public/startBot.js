var loadingMsgIndex,
    botui = new BotUI('astromind-chatbot'),
    queryAPI = 'http://localhost:8282/queryTemplate?content=',
    correctDataAPI = 'http://localhost:8282/correctModelOutput';

var showFlag = true

/**
 * 用户发送消息
 */
function humanSendMsg() {
    let humanSay = $("#userInput").val();

    botui.message.add({
        human: true,
        photo: 'https://moin.im/face.svg',
        content: humanSay
    }).then(function (index) {
        console.log(" human say :" + humanSay)
        // 到机器人上场
        botSendMsg(humanSay)

    });

    // 清空input
    $("#userInput").val('')
}


/**
 *  chatbot显示消息
 * @param {*} question 
 */
async function botSendMsg(question) {
    let index = await botui.message.add({
        photo: 'https://moin.im/face.svg',
        loading: true
    })
    // 请求chatbot聊天
    let thinkData = await chatbotThink(question);

    console.log("----chatbotThink 返回数据------")
    console.log(JSON.stringify(thinkData))

    // model服务正常返回数据
    if (thinkData != 'request timeout, please try again') {

        if (typeof (thinkData) != "object") {
            try {
                thinkData = JSON.parse(thinkData)
            } catch (error) {
                console.log("json parse error")
                console.log("think data : " + thinkData)
            }
        }

        if (typeof (thinkData.data.modelRes) != "string") {

            $("#res").val(JSON.stringify(thinkData.data.modelRes))
        } else {

            $("#res").val(thinkData.data.modelRes)
        }

        // 显示model返回数据
        await botui.message.update(index, {
            content: JSON.stringify(thinkData.data.naturalRes),
            loading: false
        })

        if (showFlag) {
            // 弹出提示，询问是否帮助改进笨笨的机器人
            await botui.message.add({
                photo: 'https://moin.im/face.svg',
                content: "Are you willing to help improve my clumsy?",
                delay: 1000
            })

            let res = await botui.action.button({
                action: [{ // show only one button
                    text: 'Yes,i do',
                    value: 'yes'
                }, { // show only one button
                    text: "Don't show it to me again",
                    value: 'no'
                }]
            }) // will be called when a button is clicked.
            console.log(res.value); // will print "one" from 'value'

            if (res.value == "yes") {

                // TODO 重构服务器返回数据，将自然语言回答与model 回答分开 ，并封装为Json对象

                console.log("modelRes tpye : " + typeof (thinkData.data.modelRes))
                // let originalData = JSON.parse(thinkData.data.modelRes);
                let originalData = thinkData.data.modelRes;

                let correctData = await improveBot(originalData)
                console.log(" correct data is : " + JSON.stringify(correctData))
                console.log("the human question is : " + question)

                // 用户修正后的数据，需要返回服务器，包含修正的内容，和该对话的问题。
                let retrunData = {
                    userCorrectedData: correctData,
                    question: question
                }

                botui.message.add({
                    content: "Thank you very much for making me better.",
                    photo: 'https://moin.im/face.svg',
                    delay: 1000
                })
                retrunData2Server(retrunData);
            } else {
                showFlag = false
            }
        }
    } else {
        // model服务请求失败
        await botui.message.update(index, {
            content: thinkData,
            loading: false
        })
    }
}


/**
 * 初始化，chatbot打招呼
 */
async function init() {


    // 初始化时候新建一个用户
    // $.get("http://119.29.147.254:8282/addNewUser", (data, status) => {
    //     console.log("---new user statue--")
    //     console.log(data)
    // })

    await botui.message.add({
        photo: 'https://moin.im/face.svg',
        content: 'hello,nice to meet you !'
    })
    await botui.message.add({
        content: "My name is Astromind , what can i help you?",
        photo: 'https://moin.im/face.svg',
        delay: 700
    })
}


/**
 * @description 请求服务器的model服务
 * @param {string} 用户的question 
 * @returns model 输出结果modelRes和自然语言结果naturalRes
 */
async function chatbotThink(question) {

    console.log("用户输入的内容 " + question)

    return new Promise(async function (resolve, reject) {
        $.get(queryAPI + question, function (data, status) {
            return resolve(data)
        });

        // 设置请求超时相应
        // setTimeout(() => {
        //     resolve('request timeout, please try again')
        // }, 6500);
    })
}


/**
 * 纠正model原始输出数据
 * 
 * @param {*} originalData model原始输出数据
 * @returns 纠正后的数据
 * 
 */
async function improveBot(originalData) {
    // 用户纠正后的输出
    let correctData = {}

    for (item in originalData) {
        console.log("traversing origialData item : " + item)
        // let correctField = correctModeOutput()
        correctData[item] = await correctModeOutput(item, originalData)
    }

    console.log(JSON.stringify(correctData))

    return correctData

}

/**
 * bot 询问用户答案
 * @returns 返回用户输入的答案
 */
async function askAnswer() {
    await botui.message.add({
        // 机器人询问
        content: 'What do you think it is?',
        photo: 'https://moin.im/face.svg'
    })
    // 用户输出框
    return await botui.action.text({
        action: {
            placeholder: 'correct answer'
        }
    })
    // })
}


/**
 * 纠正model某个字段
 * @param {*} field  需要纠正的字段
 * @param {*} originalData model原始输出数据
 * @returns 返回用户纠正之后的字段值
 */
async function correctModeOutput(field, originalData) {
    // correct subject
    await botui.message.add({
        photo: 'https://moin.im/face.svg',
        content: "In the last sentence,The " + field + " is '" + originalData[field] + "' right?",
        delay: 1000
    })

    let res = await botui.action.button({
        action: [{ // show only one button
            text: 'yes',
            value: 'yes'
        }, { // show only one button
            text: "no",
            value: 'no'
        }]
    })

    // 用户认为model输出不对
    if (res.value === "no") {
        //用户输入的答案
        let answerFromUser = await askAnswer();

        console.log("correct subject ,answer from user :" + answerFromUser)
        return answerFromUser.value == "" ? originalData[field] : answerFromUser.value;
    } else {
        return originalData[field]
    }
}


/**
 * @description 向服务器返回用户纠正后的数据
 * @param {*} retrunData  用户纠正后的数据
 */
function retrunData2Server(retrunData) {

    $.ajax({
        url: correctDataAPI,
        type: 'POST',
        data: JSON.stringify(retrunData),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        async: false,
        success: function (msg) {
            console.log(msg);
        }
    });
    // TODO post 请求
    console.log("TODO  return data 2 serve ")
    console.log("return data : " + retrunData)

}

// 执行初始化
init();