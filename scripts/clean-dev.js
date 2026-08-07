const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function killPort(port) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!line.includes("LISTENING")) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /F /PID ${pid}`, { stdio: "inherit" });
        console.log("Killed PID", pid, "on port", port);
      } catch (e) {
        console.log("Could not kill", pid, e.message);
      }
    }
  } catch (_) {
    console.log("No listener on", port);
  }
}

killPort(3000);
killPort(3001);

const nextDir = path.join(process.cwd(), ".next");
if (fs.existsSync(nextDir)) {
  fs.rmSync(nextDir, { recursive: true, force: true });
  console.log("Removed .next");
} else {
  console.log("No .next to remove");
}
