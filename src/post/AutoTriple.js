// Generated file by using converter.js and vanjs-converter
import van from "vanjs-core";
import { goto, Route } from "vanjs-router";

import '../style.css'

const {a,br,h1,h2,p} = van.tags;

export const AutoTripleTitle = () => {
    return van.tags.section(van.tags.div(
        { class: "content-title" },
        van.tags.a({class: "router", onclick: () => {goto("AutoTriple")}}, van.tags.h2("AutoTriple")),
    ));
}

export const AutoTriple = () => {
    
    return van.tags.main({class: "blog"},
        van.tags.div(
    h1(   "AutoTriple", ), p(   "由于看视频不想三联，临时起意写了个小脚本，帮我自动三联虽然现在写的还不是很完善，好像还有bug而且设计依托答辩，至少能用不是吗()",   br(),   a({href: "https://github.com/IceWind233/AutoTriple"},     "Link",   ),   "。",   br(), ), h2(   "2025-02-14", ), p(   "春节写的这个脚本，但是一直没有把博客推上来，主要还是自己写的blog不是很健全，这段时间工作没啥事就把博客的基础功能建设了一下。",   br(),   "\n先说说遇到什么问题吧。好久没有碰js了而且写脚本用的也是原生js甚是不习惯。写了这小玩意不能说完全回忆起js怎么写，只能说还是不咋会。",   br(),   "\n其次就是我的经典async问题，这个异步始终是不太明白，最近也在写dart，也用到了异步函数，但是始终不明白，但是你要问我哪不明白，我也说不上来，感觉就是用的太少，再加上天天问神奇海螺(GPT, DeepSeek...)。肉眼可见的感受到自己代码能力和阅读能力有所退步，想摆脱想合理使用，感觉上是不太可能。但是话又说回来了，确实通过大模型学到好多平时不会注意到或者不知道的东西(突然想起我的学长xhe说过: 多想一步，多搜一点)。",   br(),   "\n还是那句话Coding while Learning。多学多写总比不写不看的我要强一点的，强一点也是强。",   br(),   "\n然后就是要说一下这个b插件了，首先我知道这个edge的插件和chrome插件基本是兼容的，但是没想到插微软doc里面函数接口或者属性什么的，会直接跳转到Google那边，有点搞笑(有点懒了只能说)。",   br(),   "\n本来以为写个小脚本能有啥问题，md写了之后才发现，这不是这么简单啊！！一直以为chrome就是刷新一下或者打开页面就加载一下你的脚本，写完发现，有popup，有background-service，甚至还有通信机制(虽然不知道具体是哪种，但是会用就完事了)。",   br(),   "\n脚本逻辑很简单其实，主要是就是从popup.html里面设置一下仅点赞还是三联(仅投币功能还没做，投币会弹窗感觉不是很好搞，不如不做)，设置阈值，然后点开视频以后结合播放进度和打开页面的时间，都到达阈值的时候就点赞或三联，逻辑反正挺简单的，所以感觉有点不太合理，但是暂时没想到什么改进方法(在想要不要加一个排除短视频这种功能)。",   br(),   "\n本来是想把这个插件交到edge extension上的但是没过审核，说我脚本目的不明确，好像是还有bug所以没给我过，不如就不上架，在仓库里呆着吃灰。看有没有大怨种用我的插件，然后遇到问题还会好心给我提issue吧XDD。", ),));
}

export const AutoTripleRouter = () => {
    return Route({
          rule: "AutoTriple",
          Loader: () => {
            return AutoTriple();
          }
    })
}

