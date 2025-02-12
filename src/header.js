import van from "vanjs-core";
import { Route, goto  } from "vanjs-router";

const { div, header, section, h1, img, a } = van.tags;

export const head = () => {
  return header(
    div({class: "title router", onclick: () => {goto ("home")}}, img({ src: "/avatar.jpg", class: "avatar icon" }), h1("IceWind233 Blog")),
    // add github and bilibili icon
    div({ class: "icons" },
      a({ href: "https://github.com/IceWind233" }, img({ src: "/github_icon.svg", class: "icon" })),
      a({ href: "https://space.bilibili.com/85515549" }, img({ src: "/bilibili_icon.svg", class: "icon" })))
  );
};