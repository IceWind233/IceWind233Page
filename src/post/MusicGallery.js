// Generated file by using converter.js and vanjs-converter
import van from "vanjs-core";
import { goto, Route } from "vanjs-router";

import '../style.css'

const {a,h1,h2,hr,p} = van.tags;

export const MusicGalleryTitle = () => {
    return van.tags.section(van.tags.div(
        { class: "content-title" },
        van.tags.a({class: "router", onclick: () => {goto("MusicGallery")}}, van.tags.h2("MusicGallery")),
    ));
}

export const MusicGallery = () => {
    
    return van.tags.main({class: "blog"},
        van.tags.div(
    h1(   "Music Gallary", ), hr(), h2(   "Intro", ), p(   "就是一个喜欢音乐的人的小空间，发点莫名其妙的东西记录一下自己的日常音乐生活？但是不一定都记录，反正就是在不断练习中度过的(要是哪天能弹琴认识妹子我倒是肯定会更新的XDD)。自己不是专业的音乐人，所以也就随便玩玩，但还是有些追求的，只不过也会犯懒，目前主攻钢琴，会一点小提琴，单簧管，还有尤克里里但是基本上已经忘光了。会学的会学的，以后想能够自己改编一点acg的曲子，能多种乐器合奏，狠狠一个人的乐队(当然更希望有朋友能一起玩，倒是也有这样的群体只不过他们水平太高了我感觉不是很能配合😭😭😭)。", ), h2(   "2025-03-10", ), p(   "前几天在听张晓笛教小孩音乐突发奇想，我也跟着感觉弄了一首",   a({href: "https://github.com/IceWind233/MusicGarden"},     "小曲",   ),   "简简单单反正没啥特殊的感觉，甚至连名字都起名叫Come Out From Other属于是不知道起啥名字了，只是听到别人即兴弹琴临时起意，创造了人生中第一首记录下来的曲子(SHIT)，简简单单，都是单音和弦跟没有一样，完全跟着感觉走，也没有什么想表达的深层意义，单纯就是感觉，可能这就是我现在的音乐的感觉吧，刚刚入门还什么都不会，基础也不扎实的样子吧。", ),));
}

export const MusicGalleryRouter = () => {
    return Route({
          rule: "MusicGallery",
          Loader: () => {
            return MusicGallery();
          }
    })
}

