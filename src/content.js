import van from "vanjs-core";

const { div, h2, hr, a, p, section } = van.tags;

export const content = (title, href, detail) => {
    return section(div(
        { class: "content" },
        a({href: `${href}`}, h2(`${title}`)),
        hr(),
        p(`${detail}`)
    ));
};