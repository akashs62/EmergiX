
const fs = require("fs");
let html = fs.readFileSync("index.html", "utf8");

// Colors
html = html.replace(/#2EC4B6/ig, "#27AE60");
html = html.replace(/rgba\(46, 196, 182/g, "rgba(39, 174, 96");

// Header Nav Logo
html = html.replace(
    /<a href="#home" class="nav-logo" aria-label="EmergiX Home">[\s\S]*?<span class="logo-text">EmergiX<\/span>\s*<\/a>/,
    `<a href="#home" class="nav-logo" aria-label="EmergiX Home" style="gap:0;">\n                <img src="logo.png" alt="EmergiX Logo" height="64" style="display:block;height:64px;width:auto;mix-blend-mode:multiply;" />\n            </a>`
);

// Sign in button
html = html.replace(
    /<button class="btn-signin" id="btnSignin">Sign In<\/button>/,
    `<a href="signin.html" class="btn-signin" id="btnSignin" style="text-decoration:none;">Sign In</a>`
);

// Hero title
html = html.replace(
    /Every Second Counts<br \/>\s*<span class="hero-title-accent">in an Emergency<\/span>/,
    `Time is life`
);

// Hero counters
html = html.replace(/"heroLives">12,500\+<\/div>/, `"heroLives">0</div>`);
html = html.replace(/<div class="hfc-num">8 min<\/div>/, `<div class="hfc-num">0 min</div>`);
html = html.replace(/<div class="hfc-num">150\+<\/div>/, `<div class="hfc-num">0</div>`);

// Stats cards
html = html.replace(/data-count="12500" data-suffix="\+"/g, `data-count="0"`);
html = html.replace(/data-count="500" data-suffix="\+"/g, `data-count="0"`);
html = html.replace(/data-count="150" data-suffix="\+"/g, `data-count="0"`);
html = html.replace(/data-count="45" data-suffix="\+"/g, `data-count="0"`);

// Label changes
html = html.replace(/Cities Served/g, "Service Provider");
html = html.replace(/aria-label="12,500\+ Lives Saved"/g, `aria-label="0 Lives Saved"`);
html = html.replace(/aria-label="500\+ Ambulances"/g, `aria-label="0 Ambulances"`);
html = html.replace(/aria-label="150\+ Partner Hospitals"/g, `aria-label="0 Partner Hospitals"`);
html = html.replace(/aria-label="45\+ Cities Served"/g, `aria-label="0 Service Provider"`);

html = html.replace(/>12,500\+</g, ">0<");
html = html.replace(/>500\+</g, ">0<");
// Cannot safely replace ">150+<" globally, let"s do it targeted:
html = html.replace(/id="s-lives">0<\/div>/, `id="s-lives">0</div>`);
html = html.replace(/id="s-amb">0<\/div>/, `id="s-amb">0</div>`);
html = html.replace(/id="s-hosp">0<\/div>/, `id="s-hosp">0</div>`);
html = html.replace(/id="s-cities">0<\/div>/, `id="s-cities">0</div>`);
html = html.replace(/<div class="stat-number" id="s-[a-z]+">0<\/div>/g, (m) => m); // already zeroed in HTML??
// Actually originally they are "0" in the HTML because JS updates them. But wait. In original index.html they are "0" before JS runs! Look at line 236: `<div class="stat-number" id="s-lives">0</div>`. I dont need to change the innerHTML, just data-count!

// Footer Logo removal
html = html.replace(
    /<a href="#home" class="nav-logo footer-logo-link" aria-label="EmergiX Home">[\s\S]*?<span class="logo-text">EmergiX<\/span>\s*<\/a>/,
    ``
);

// Real-time bed availability
html = html.replace(
    /<li>.*?Real-time bed availability across\s*all partner hospitals<\/li>/g,
    ``
);

fs.writeFileSync("index.html", html, "utf8");

// Also apply CSS colors
let css = fs.readFileSync("style.css", "utf8");
css = css.replace(/#2EC4B6/ig, "#27AE60");
css = css.replace(/rgba\(46, 196, 182/g, "rgba(39, 174, 96");
fs.writeFileSync("style.css", css, "utf8");

