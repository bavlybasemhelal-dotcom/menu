import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
const mode = process.argv[2] || "start";
if (!["start", "rules", "browser"].includes(mode))
  throw Error("Unknown local emulator task");
mkdirSync(".local", { recursive: true });
const rules = readFileSync("firestore.rules", "utf8").replace(
  /function allowedUid\(\) \{ return '[^']+'; \}/,
  "function allowedUid() { return 'emulator-admin'; }",
);
writeFileSync(".local/firestore.emulator.rules", rules);
const env = { ...process.env };
if (existsSync(".local/java")) {
  const folder = readdirSync(".local/java").find((v) => v.startsWith("jdk-"));
  if (folder) {
    env.JAVA_HOME = path.resolve(".local/java", folder);
    const previous = env.Path || env.PATH || "";
    delete env.Path;
    env.PATH = path.join(env.JAVA_HOME, "bin") + path.delimiter + previous;
  }
}
const args = [
  mode === "start" ? "emulators:start" : "emulators:exec",
  "--only",
  "firestore,auth",
  "--project",
  "demo-souqna",
  "--config",
  "firebase.emulators.json",
];
if (mode !== "start")
  args.push(mode === "rules" ? "npm run test:integration" : "npm run test:e2e");
const cli =
  process.platform === "win32"
    ? path.join(
        env.APPDATA || "",
        "npm/node_modules/firebase-tools/lib/bin/firebase.js",
      )
    : null;
const child =
  cli && existsSync(cli)
    ? spawn(process.execPath, [cli, ...args], { stdio: "inherit", env })
    : spawn("firebase", args, { stdio: "inherit", env });
child.on("exit", (code) => process.exit(code ?? 1));
