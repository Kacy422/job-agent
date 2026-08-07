const fs = require("fs");
console.log("node", process.version);
function t(p) {
  try {
    const target = fs.readlinkSync(p);
    console.log(p, "LINK ->", target);
  } catch (e) {
    console.log(p, e.code);
  }
}
t("package.json");
t("node_modules/next/package.json");
t("C:/Windows/System32/drivers/etc/hosts");
t("src/app/page.tsx");
