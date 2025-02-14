import van from "vanjs-core";
import confetti from "canvas-confetti";
import { Route, goto, nowHash } from "vanjs-router";

import { head } from "./header.js";
import { content } from "./content.js";
import * as blogs from "./post/modules.js";

import './style.css'

const { body, br, div, h2, h3, hr, img, main, nav, p, section, s } = van.tags;

const test = [
  {
    title: "什么都没有",
    href: "#",
    detail: "这里还什么都没有随便写点凑凑大小，会写的会写的，过段时间就写。。。"
  },
]

const intro = `\t一个平平无奇的小人物的个人博客，不是很好看但已经是直男审美的极限了。\n写这个博客的意义感觉也就是在GitHub倒闭之前能在互联网上留下一点自己的痕迹罢了，直到这个博客的第一次提交之前我还是没有想好要传点什么上来，可能会传平时学的比较有意思的小玩意，或者自己写什么抽象的东西，或者是自己弹琴的经验感受啥的(没准哪天就把谱子也传上来了)。这个博客的意义也就是随便说说随便传点东西，当然我希望能一直把这个博客维护下去。\n平时也想写点有的没的的小玩意但是总是咕咕咕🕊️，只能说热爱计算机但是不完全热爱，毕竟上班了回家第一件事就是躺床上开摸，最近也有一两个想写的小玩意，尽量在春节放假的时候写写(新建文件夹)，写完或者新建新建项目时候会第一时间更新博客的()，当然我确实希望这个博客的存在能督促我多学习一点计算机的小玩意吧XD。\n最后欢迎你陌生人也可能是朋友，希望你喜欢。`;

const page = () => {
  return main({ class: "main" },
    div({ class: "intro" },
      h2("简介"),
      p(`${intro}`)
    ),
    h2("下面有点东西但不多"),
    hr(),

    blogs.AutoTriple.AutoTripleTitle(),
  );
}

const Season = {
  spring: ['🌷', '🌸',],
  summer: ['☀️', '🍉',],
  autumn: ['🍁', '🍂',],
  winter: ['❄️', '☃️',],
}

const getSeasonIcon = () => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) {
    return Season.spring;
  } else if (month >= 5 && month <= 7) {
    return Season.summer;
  } else if (month >= 8 && month <= 10) {
    return Season.autumn;
  } else {
    return Season.winter;
  }
}

const setConffetti = () => {
  const directions = [
    { angle: 60, origin: { x: 0 }, },
    { angle: 120, origin: { x: 1 }, }
  ]
  const confettiConfig = {
    particleCount: 100,
    angle: 60,
    scalar: 2,
    spread: 70,
  }
  let iconArr = getSeasonIcon();
  const today = new Date();
  if (today.getDay() === 4) {
    iconArr = iconArr.concat(['🍟', '🍗',]);
  }
  console.log(iconArr);
  let shapes = iconArr.map(obj => confetti.shapeFromText(obj));

  confetti({
    ...confettiConfig,
    shapes: [...shapes],
    ...directions[0],
  });
  confetti({
    ...confettiConfig,
    shapes: [...shapes],
    ...directions[1],
  })
}


const render = () => {
  setConffetti();

  return [
    head(),
    Route({
      rule: "home",
      Loader: () => {
        return div(
          div({ id: "contrib" }, div(h2("耻辱墙()")), img({ src: "https://ghchart.rshah.org/EC473B/icewind233", loading: "lazy" })),
          page())
      }
    }),
    blogs.AutoTriple.AutoTripleRouter(),
  ];
}


van.add(document.body, render());