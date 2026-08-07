const fs = require("fs");
const path = require("path");
const pkg = JSON.parse(
  fs.readFileSync(path.join("node_modules", "pdf-parse", "package.json"), "utf8")
);
console.log("version", pkg.version);
console.log("main", pkg.main);
console.log("exports", JSON.stringify(pkg.exports, null, 2));
try {
  const mod = require("pdf-parse");
  console.log("typeof mod", typeof mod);
  console.log("keys", Object.keys(mod).slice(0, 20));
  console.log("default type", typeof mod.default);
} catch (e) {
  console.log("require error", e.message);
}
