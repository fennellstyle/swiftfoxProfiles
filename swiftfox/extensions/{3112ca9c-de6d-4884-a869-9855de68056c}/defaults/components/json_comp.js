/*
 Copyright (C) 2008 Google Inc.

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

// Built from //third_party/javascript/json_sans_eval:json_sans_eval.js.

var jsonParse=function(){var i="(?:-?\\b(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\\b)",j='(?:[^\\0-\\x08\\x0a-\\x1f"\\\\]|\\\\(?:["/\\\\bfnrt]|u[0-9A-Fa-f]{4}))',k='(?:"'+j+'*")',l=new RegExp("(?:false|true|null|[\\{\\}\\[\\]]|"+i+"|"+k+")","g"),m=new RegExp("\\\\(?:([^u])|u(.{4}))","g"),n={'"':'"',"/":"/","\\":"\\",b:"\u0008",f:"\u000c",n:"\n",r:"\r",t:"\t"};function o(h,e,f){return e?n[e]:String.fromCharCode(parseInt(f,16))}var p=new String(""),r={"{":Object,"[":Array};return function(h){var e=
h.match(l),f,c=e[0];if("{"===c)f={};else if("["===c)f=[];else throw new Error(c);for(var b,d=[f],g=1,q=e.length;g<q;++g){c=e[g];var a;switch(c.charCodeAt(0)){default:a=d[0];a[b||a.length]=+c;b=void 0;break;case 34:c=c.substring(1,c.length-1);if(c.indexOf("\\")!==-1)c=c.replace(m,o);a=d[0];if(!b)if(a instanceof Array)b=a.length;else{b=c||p;break}a[b]=c;b=void 0;break;case 91:a=d[0];d.unshift(a[b||a.length]=[]);b=void 0;break;case 93:d.shift();break;case 102:a=d[0];a[b||a.length]=false;b=void 0;break;
case 110:a=d[0];a[b||a.length]=null;b=void 0;break;case 116:a=d[0];a[b||a.length]=true;b=void 0;break;case 123:a=d[0];d.unshift(a[b||a.length]={});b=void 0;break;case 125:d.shift();break}}if(d.length)throw new Error;return f}}();
