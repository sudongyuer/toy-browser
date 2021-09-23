const css =require('css')
const EOF = Symbol("EOF");
const layout = require("./layout.js");

let currentToken = null;
let currentAttribute = null;
let stack = [{ type: "document", children: [] }]; //doms树解析用的栈

let currentTextNode=null;

let rules=[];
function addCSSRules(text){
    var ast=css.parse(text);
    // console.log(JSON.stringify(ast,null,4));
    rules.push(...ast.stylesheet.rules);
}
//选择器是否匹配元素
function match(element,selector){
    if(!selector||!element.attributes){
        return false;
    }
    if(selector.charAt(0)=="#"){
        var attr =element.attributes.filter(attr=>attr.name === "id")[0]
        if(attr && attr.value === selector.replace("#",'')){
            return true;
        }
    }else if(selector.charAt(0)=='.'){
        var attr =element.attributes.filter(attr=>attr.name==='class')[0]
        if(attr && attr.value ===selector.replace('.','')){
            return true;
        }
    }else{
        if(element.tagName === selector){
            return true;
        }
    }
    return false;
}

function specificity(selector){
    var p=[0,0,0,0];
    var selectorParts=selector.split(" ");
    for(var part of selectorParts){
        if(part.charAt(0)=="#"){
            p[1]+=1;
        }else if(part.charAt(0)=="."){
            p[2]+=1;
        }else {
            p[3]+=1;
        }
    }
    return p;
}

function compare(sp1,sp2){
    if(sp1[0]-sp2[0]){
        return sp1[0]-sp2[0];
    }
    if(sp1[1]-sp2[1]){
        return sp1[1]-sp2[1];
    }
    if(sp1[2]-sp2[2]){
        return sp1[2]-sp2[2];
    }
    return sp1[3]-sp2[3];

}
// 计算css
function computeCSS(element){
    // console.log("compute CSS for Element",element);
    var elements =stack.slice().reverse();
    if(!element.computedStyle){
        element.computedStyle={};
    }
    for(let rule of rules){
        //对选择器取反拿到最内层选择器
        var selectorParts = rule.selectors[0].split(" ").reverse();
        if(!match(element,selectorParts[0])){
            continue;
        }

        var j=1;
        //匹配当前元素的父元素是否能够匹配选择器
        for(var i=0;i<elements.length;i++){
            if(match(elements[i],selectorParts[j])){
                j++;
            }
        }
        if(j>=selectorParts.length){
            //匹配成功
            matched=true;
        }
        if(matched){
            // console.log("Element",element,"matched rule",rule);
            var sp=specificity(rule.selectors[0]);
            var computedStyle=element.computedStyle;
            for(var declaration of rule.declarations){
                if(!computedStyle[declaration.property]){
                    computedStyle[declaration.property]={}
                }

                if(!computedStyle[declaration.property].specificity){
                    computedStyle[declaration.property].value=declaration.value
                    computedStyle[declaration.property].specificity=sp
                }else if(compare(computedStyle[declaration.property].specificity,sp)<0){
                    // for(var k=0;k<4;k++){
                    //     computedStyle[declaration].property[declaration.value][k]+=sp[k];
                    // }
                    computedStyle[declaration.property].value=declaration.value;
                    computedStyle[declaration.property].specificity=sp;

                }
                // console.log(element.computedStyle);
            }
        }
    }
}
//语法分析
function emit(token) {
  let top = stack[stack.length - 1];
    // console.log(token);

  if (token.type == "startTag") {
    let element = {
      type: "element",
      children: [],
      attributes: [],
    };
    element.tagName = token.tagName;
    for (let p in token) {
      if (p != "type" && p != "tagName") {
        element.attributes.push({
          name: p,
          value: token[p],
        });
      }
    }
    //计算CSS
    computeCSS(element);
    top.children.push(element);
    // element.parent = top;

    if (!token.isSelfClosing) {
      stack.push(element);
    }
    currentTextNode = null;
  } else if (token.type == "endTag") {
    if (top.tagName != token.tagName) {
      throw new Error("tag start end doesn't match!");
    } else {
        //遇到Style标签时，执行添加CSS规则的操作
        if(top.tagName==="style"){
            addCSSRules(top.children[0].content);
        }
      stack.pop();
    }
    //计算dom在浏览器显示的位置
      layout(top);
    currentTextNode = null;
  }else if (token.type === "text") {
    if(currentTextNode==null){
        currentTextNode={
            type:"text",
            content:""
        }
        top.children.push(currentTextNode);
    }
    currentTextNode.content+=token.content;
  // return;
}
}


function data(c) {
  if (c == "<") {
    return tagOpen;
  } else if (c == EOF) {
    emit({
      type: "EOF",
    });
    return;
  } else {
      emit({
          type:"text",
          content:c
      })
    return data;
  }
}

function tagOpen(c) {
  if (c == "/") {
    return endTagOpen;
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: "startTag",
      tagName: "",
    };
    return tagName(c);
  } else {
    emit({
      type: "text",
      content: c,
    });
    return;
  }
}

// function endTagOpen(c){
//     if(c.match(/^[a-zA-Z]$/)){
//         currentToken={
//             type:"endTag",
//             tagName:""
//         }
//         return tagName(c);
//     }else if(c == ">"){

//     }else if(c==EOF){

//     }else{

//     }
// }

function tagName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (c == "/") {
    return selfClosingStartTag;
  } else if (c.match(/^[a-zA-Z]$/)) {
    currentToken.tagName += c; //.toLowerCase()；
    return tagName;
  } else if (c == ">") {
    emit(currentToken);
    return data;
  } else {
    currentToken.tagName += c;
    return tagName;
  }
}

function beforeAttributeName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (c == "/" || c == ">" || c == EOF) {
    return afterAttributeName(c);
  } else if (c == "=") {
    // return beforeAttributeName;
  } else {
    // return beforeAttributeName;
    currentAttribute = {
      name: "",
      value: "",
    };
    return attributeName(c);
  }
}

function attributeName(c) {
  if (c.match(/^[\t\n\f ]$/) || c == "/" || c == ">" || c == EOF) {
    return afterAttributeName(c);
  } else if (c == "=") {
    return beforeAttributeValue;
  } else if (c == "\u0000") {
  } else if (c == '"' || c == "'" || c == "<") {
  } else {
    currentAttribute.name += c;
    return attributeName;
  }
}

function beforeAttributeValue(c) {
  if (c.match(/^[\t\n\f ]$/) || c == "/" || c == ">" || c == EOF) {
    return beforeAttributeValue;
  } else if (c == '"') {
    return doubleQuotedAttributeValue;
  } else if (c == "'") {
    return singleQuotedAttributeValue;
  } else if (c == ">") {
    //reuturn data
  } else {
    return UnquotedAttributeValue(c);
  }
}
// TODO

function doubleQuotedAttributeValue(c) {
  if (c == '"') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c == "\u0000") {
  } else if (c == EOF) {
  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}
function singleQuotedAttributeValue(c) {
  if (c == '\'') {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return afterQuotedAttributeValue;
  } else if (c == "\u0000") {
  } else if (c == EOF) {
  } else {
    currentAttribute.value += c;
    return singleQuotedAttributeValue;
  }
}

function afterQuotedAttributeValue(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return beforeAttributeName;
  } else if (c == "/") {
    return selfClosingStartTag;
  } else if (c == ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c == EOF) {
  } else {
    currentAttribute.value += c;
    return doubleQuotedAttributeValue;
  }
}

function UnquotedAttributeValue(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return beforeAttributeName;
  } else if (c == "/") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    return selfClosingStartTag;
  } else if (c == ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c == "\u0000") {
  } else if (c == '"' || c == "'" || c == "<" || c == "=" || c == "`") {
  } else if (c == EOF) {
  } else {
    currentAttribute.value += c;
    return UnquotedAttributeValue;
  }
}

function selfClosingStartTag(c) {
  if (c == ">") {
    currentToken.isSelfClosing = true;
    emit(currentToken);
    return data;
  } else if (c == "EOF") {
  } else {
  }
}

function endTagOpen(c) {
  if (c.match(/^[a-zA-Z]$/)) {
    currentToken = {
      type: "endTag",
      tagName: "",
    };
    return tagName(c);
  } else if (c == ">") {
  } else if (c == EOF) {
  } else {
  }
}

function afterAttributeName(c) {
  if (c.match(/^[\t\n\f ]$/)) {
    return afterAttributeName;
  } else if (c == "/") {
    return selfClosingStartTag;
  } else if (c == "=") {
    return beforeAttributeValue;
  } else if (c == ">") {
    currentToken[currentAttribute.name] = currentAttribute.value;
    emit(currentToken);
    return data;
  } else if (c == EOF) {
  } else {
    currentToken[currentAttribute.name] = currentToken.value;
    currentAttribute = {
      name: "",
      value: "",
    };
    return attributeName(c);
  }
}

module.exports.parseHTML = function parseHTML(html) {
  let state = data;
  // console.log("parser:",html);
  //词法分析
  for (let c of html) {
    state = state(c);
  }
  state = state(EOF);
  return stack[0];
};
