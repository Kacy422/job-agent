const fs = require("fs");
const path = require("path");
const hold = path.join("src", "app", "api", "_hold");
if (fs.existsSync(hold)) {
  fs.rmSync(hold, { recursive: true, force: true });
  console.log("removed _hold");
}
console.log(fs.readdirSync(path.join("src", "app", "api")).join(", "));
