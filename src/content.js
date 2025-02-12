import van from "vanjs-core";
import { Route, goto } from "vanjs-router";

const { div, h2, hr, a, p, section } = van.tags;

export const content = (title, href, detail) => {
    return section(div(
        { class: "content" },
        a({class: "router", onclick: () => {goto("content", title, detail)}}, h2(`${title}`)),
        hr(),
        p(`${detail}`)
    ));
};