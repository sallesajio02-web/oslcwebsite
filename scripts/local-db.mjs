import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  readFileSync,
} from "node:fs";
import path from "node:path";
import pg from "pg";
// A separate loopback-only development cluster. Never modifies an existing PostgreSQL service.
const root = path.resolve(".local"),
  data = path.join(root, "postgres"),
  port = "55432";
const bin = process.env.POSTGRES_BIN || "C:/Program Files/PostgreSQL/18/bin";
const exe = (name) =>
  path.join(bin, name + (process.platform === "win32" ? ".exe" : ""));
function run(name, args, env = {}) {
  const r = spawnSync(exe(name), args, {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, ...env },
  });
  if (r.status !== 0) throw new Error(name + " failed");
}
mkdirSync(root, { recursive: true });
if (!existsSync(path.join(data, "PG_VERSION"))) {
  if (existsSync(".env"))
    throw new Error(
      "An .env file already exists. Configure your existing database or move it before initializing a separate local cluster.",
    );
  const password = randomBytes(32).toString("hex"),
    pwfile = path.join(root, "init-password");
  writeFileSync(pwfile, password, { mode: 0o600 });
  try {
    run("initdb", [
      "-D",
      data,
      "-U",
      "oslc_dev",
      "--auth=scram-sha-256",
      "--encoding=UTF8",
      "--locale=C",
      "--pwfile=" + pwfile,
    ]);
  } finally {
    unlinkSync(pwfile);
  }
  writeFileSync(
    ".env",
    `PORT=3001\nSITE_URL=http://localhost:5173\nDATABASE_URL=postgresql://oslc_dev:${password}@127.0.0.1:${port}/oslc\nDATABASE_SSL=false\nSESSION_SECRET=${randomBytes(48).toString("hex")}\nUPLOAD_DIR=./uploads\n`,
    { mode: 0o600 },
  );
  run("pg_ctl", [
    "-D",
    data,
    "-l",
    path.join(root, "postgres.log"),
    "-o",
    `-h 127.0.0.1 -p ${port}`,
    "-w",
    "start",
  ]);
} else {
  const status = spawnSync(exe("pg_ctl"), ["-D", data, "status"], {
    windowsHide: true,
    stdio: "ignore",
  });
  if (status.status !== 0)
    run("pg_ctl", [
      "-D",
      data,
      "-l",
      path.join(root, "postgres.log"),
      "-o",
      `-h 127.0.0.1 -p ${port}`,
      "-w",
      "start",
    ]);
}
const env = readFileSync(".env", "utf8");
const connection = env.match(/^DATABASE_URL=(.+)$/m)?.[1];
if (!connection) throw new Error("Missing DATABASE_URL");
const adminUrl = new URL(connection);
adminUrl.pathname = "/postgres";
const client = new pg.Client({ connectionString: adminUrl.href });
await client.connect();
try {
  if (
    !(await client.query("SELECT 1 FROM pg_database WHERE datname='oslc'"))
      .rowCount
  )
    await client.query("CREATE DATABASE oslc");
} finally {
  await client.end();
}
console.log(
  "Isolated local PostgreSQL is ready on 127.0.0.1:" +
    port +
    ". Credentials are stored only in ignored .env.",
);
