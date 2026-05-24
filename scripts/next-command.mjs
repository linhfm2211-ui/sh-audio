import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const command = process.argv[2] ?? "dev";
const args = process.argv.slice(3);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
const wasmDir = join(root, "node_modules", "@next", "swc-wasm-nodejs");

const env = { ...process.env };

if (process.platform === "win32" && existsSync(wasmDir)) {
  env.NEXT_TEST_WASM = "1";
  env.NEXT_TEST_WASM_DIR = wasmDir;
}

const child = spawn(process.execPath, [nextBin, command, ...args], {
  cwd: root,
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }

  process.exit(code ?? 1);
});
