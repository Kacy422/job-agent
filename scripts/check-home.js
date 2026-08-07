const http = require("http");
http
  .get("http://127.0.0.1:3000/", (res) => {
    console.log("status", res.statusCode);
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
      console.log("has JobAgent", data.includes("JobAgent"));
      console.log("has error", /Internal Server Error|Application error/i.test(data));
      process.exit(res.statusCode === 200 && data.includes("JobAgent") ? 0 : 1);
    });
  })
  .on("error", (e) => {
    console.error(e);
    process.exit(1);
  });
