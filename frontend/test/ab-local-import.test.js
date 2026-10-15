import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("local AB command refuses a remote database before configuring secrets or making imports", () => {
  const environmentFile = new URL("../.env.local", import.meta.url);
  const checksum = () => {
    try { return createHash("sha256").update(readFileSync(environmentFile)).digest("hex"); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
  };
  const before = checksum();
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("../scripts/sync-kitchen-abs-local.mjs", import.meta.url)), "--setup"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, DATABASE_URL: "postgresql://test:test@remote.invalid:5432/test" },
    encoding: "utf8", timeout: 15000,
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /requires PostgreSQL on localhost/);
  assert.equal(result.stdout.includes("Configured a private local sync token"), false);
  assert.equal(checksum(), before);
});
