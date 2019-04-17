/**
 * @params title , 变量名 ，content 变量值
 */
module.exports = function LOG(title, content) {

    console.log('-------' + title + '--------')
    console.log(content)
    console.log('----------------------')
}