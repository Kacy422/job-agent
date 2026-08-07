const fs = require("fs");
const path = require("path");

const root = process.cwd();

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.lstatSync(p);
    if (st.isDirectory()) walk(p, files);
    else files.push(p);
  }
  return files;
}

function hasEisdir(p) {
  try {
    fs.readlinkSync(p);
    return false;
  } catch (e) {
    return e && e.code === "EISDIR";
  }
}

function rewriteFile(p) {
  const content = fs.readFileSync(p);
  const tmp = p + ".tmpfix";
  fs.writeFileSync(tmp, content);
  fs.unlinkSync(p);
  fs.renameSync(tmp, p);
  // touch timestamps
  const now = new Date();
  try {
    fs.utimesSync(p, now, now);
  } catch (_) {}
}

const srcFiles = walk(path.join(root, "src"));
let fixed = 0;
for (const p of srcFiles) {
  if (hasEisdir(p)) {
    console.log("fixing EISDIR:", path.relative(root, p));
    rewriteFile(p);
    fixed++;
    if (hasEisdir(p)) {
      console.log("  STILL BROKEN:", path.relative(root, p));
    } else {
      console.log("  OK");
    }
  }
}
console.log("Fixed", fixed, "files");

// restore agent-proxy from _hold if needed
const hold = path.join(root, "src", "app", "api", "_hold", "route.ts");
const proxyDir = path.join(root, "src", "app", "api", "agent-proxy");
const proxy = path.join(proxyDir, "route.ts");
if (fs.existsSync(hold) && !fs.existsSync(proxy)) {
  fs.mkdirSync(proxyDir, { recursive: true });
  fs.copyFileSync(hold, proxy);
  if (hasEisdir(proxy)) rewriteFile(proxy);
  console.log("Restored agent-proxy/route.ts");
}
