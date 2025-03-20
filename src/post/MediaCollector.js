// Generated file by using converter.js and vanjs-converter
import van from "vanjs-core";
import { goto, Route } from "vanjs-router";

import '../style.css'

const {h1,h2,p} = van.tags;

export const MediaCollectorTitle = () => {
    return van.tags.section(van.tags.div(
        { class: "content-title" },
        van.tags.a({class: "router", onclick: () => {goto("MediaCollector")}}, van.tags.h2("MediaCollector")),
    ));
}

export const MediaCollector = () => {
    
    return van.tags.main({class: "blog"},
        van.tags.div(
    h1(   "MediaCollector", ), p(   "电脑没有那么多接口?携带外设不方便?，局域网IS ALL U NEED，一个app能够将连接手机的外设连接到电脑上的app。", ), h2(   "2025-03-20", ), p(   "今天开始写了这个软件，但是感觉问题会很多，趁上班摸鱼写了一点，但是没多少主要功能，所以github上还是private状态，等把基本功能完善之后再去public。", ),));
}

export const MediaCollectorRouter = () => {
    return Route({
          rule: "MediaCollector",
          Loader: () => {
            return MediaCollector();
          }
    })
}

