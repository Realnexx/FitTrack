import { spawnSync } from "node:child_process";
const result = spawnSync(process.execPath, ["node_modules/vite/bin/vite.js", "build"], {
  stdio: "inherit",
  env: { ...process.env, VERCEL: "1" },
});
process.exit(result.status ?? 1);
