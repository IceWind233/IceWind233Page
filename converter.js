import { mdToVanCode } from "vanjs-converter";
import fs from 'fs';
import path from 'path';

const postsDir = path.join('./', 'post');
const outDir = path.join('./', 'src', 'post');
const files = fs.readdirSync(postsDir);

const result = files.filter(file => file.endsWith('.md')).map(file => {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    return {
        fileName: file.slice(0, file.indexOf('.')),
        content: mdToVanCode(content)
    };
});

const generateFile = (fileName, content) => {
    return `// Generated file by using converter.js and vanjs-converter
import van from "vanjs-core";
import { goto, Route } from "vanjs-router";

import '../style.css'

const {${content.tags.toLocaleString()}} = van.tags;

export const ${fileName}Title = () => {
    return van.tags.section(van.tags.div(
        { class: "content-title" },
        van.tags.a({class: "router", onclick: () => {goto("${fileName}")}}, van.tags.h2("${fileName}")),
    ));
}

export const ${fileName} = () => {
    
    return van.tags.main({class: "blog"},
        van.tags.div(
    ${content.code.join(' ')}));
}

export const ${fileName}Router = () => {
    return Route({
          rule: "${fileName}",
          Loader: () => {
            return ${fileName}();
          }
    })
}

`;
}

const genModules = (result) => {
    let str = result.map(({fileName}) => `import * as ${fileName} from "./${fileName}.js";`).join('\n');
    str += `\nexport { ${result.map(({fileName}) => fileName).join(', ')} };`;
    return str;
}

fs.writeFileSync(path.join(outDir, 'modules.js'), genModules(result));

result.forEach(({fileName, content}) => {
    fs.writeFileSync(path.join(outDir, `${fileName}.js`), generateFile(fileName, content));
});
