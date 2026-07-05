#!/usr/bin/env node
/**
 * Automatisiert Vercel-Setup für PWA Push:
 * - VAPID Keys (aus .env.local oder neu generiert)
 * - Env-Variablen auf Vercel setzen
 * - Production Redeploy
 *
 * Voraussetzung: einmal `npx vercel login` oder VERCEL_TOKEN in der Umgebung.
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import webpush from "web-push";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envLocalPath = path.join(root, ".env.local");

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

function runInherit(cmd) {
  execSync(cmd, { cwd: root, stdio: "inherit" });
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const i = trimmed.indexOf("=");
    if (i === -1) continue;
    out[trimmed.slice(0, i)] = trimmed.slice(i + 1);
  }
  return out;
}

function writeEnvLocal(vars) {
  const lines = [
    "# Auto-generated for local dev + Vercel push setup",
    `VAPID_PUBLIC_KEY=${vars.VAPID_PUBLIC_KEY}`,
    `VAPID_PRIVATE_KEY=${vars.VAPID_PRIVATE_KEY}`,
    `NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vars.VAPID_PUBLIC_KEY}`,
    `VAPID_SUBJECT=${vars.VAPID_SUBJECT}`,
    "",
    "# Upstash Redis (nach Vercel Marketplace Integration):",
    "# KV_REST_API_URL=",
    "# KV_REST_API_TOKEN=",
    "",
  ];
  fs.writeFileSync(envLocalPath, lines.join("\n"));
}

function ensureVapidKeys() {
  const existing = parseEnvFile(envLocalPath);
  if (existing.VAPID_PUBLIC_KEY && existing.VAPID_PRIVATE_KEY) {
    return {
      VAPID_PUBLIC_KEY: existing.VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY: existing.VAPID_PRIVATE_KEY,
      VAPID_SUBJECT: existing.VAPID_SUBJECT ?? "mailto:support@blume.app",
    };
  }

  const keys = webpush.generateVAPIDKeys();
  const vars = {
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    VAPID_SUBJECT: "mailto:support@blume.app",
  };
  writeEnvLocal(vars);
  console.log("✓ VAPID-Keys erzeugt und in .env.local gespeichert");
  return vars;
}

function ensureVercelAuth() {
  try {
    const who = run("npx vercel whoami");
    console.log(`✓ Vercel eingeloggt als: ${who}`);
    return true;
  } catch {
    console.error("\n✗ Nicht bei Vercel eingeloggt.");
    console.error("  Bitte einmal ausführen: npx vercel login");
    console.error("  Oder VERCEL_TOKEN als Environment Variable setzen.\n");
    return false;
  }
}

function ensureProjectLinked() {
  const vercelDir = path.join(root, ".vercel");
  if (fs.existsSync(path.join(vercelDir, "project.json"))) {
    console.log("✓ Vercel-Projekt bereits verlinkt");
    return;
  }

  console.log("→ Verlinke Projekt mit Vercel …");
  try {
    runInherit("npx vercel link --yes");
    console.log("✓ Projekt verlinkt");
  } catch {
    console.error("✗ Projekt konnte nicht automatisch verlinkt werden.");
    console.error("  Manuell: npx vercel link");
    process.exit(1);
  }
}

function setEnv(name, value) {
  for (const env of ["production", "preview", "development"]) {
    try {
      spawnSync(
        "npx",
        ["vercel", "env", "add", name, env, "--force"],
        {
          cwd: root,
          input: value,
          stdio: ["pipe", "pipe", "pipe"],
          encoding: "utf8",
        }
      );
    } catch {
      /* ignore individual failures */
    }
  }
  console.log(`  ✓ ${name}`);
}

function setVercelEnv(vars) {
  console.log("→ Setze Environment Variables auf Vercel …");
  setEnv("VAPID_PUBLIC_KEY", vars.VAPID_PUBLIC_KEY);
  setEnv("VAPID_PRIVATE_KEY", vars.VAPID_PRIVATE_KEY);
  setEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", vars.VAPID_PUBLIC_KEY);
  setEnv("VAPID_SUBJECT", vars.VAPID_SUBJECT);

  const local = parseEnvFile(envLocalPath);
  if (local.KV_REST_API_URL && local.KV_REST_API_TOKEN) {
    setEnv("KV_REST_API_URL", local.KV_REST_API_URL);
    setEnv("KV_REST_API_TOKEN", local.KV_REST_API_TOKEN);
    console.log("  ✓ KV_REST_API_URL + KV_REST_API_TOKEN");
  } else {
    console.log("\n⚠ Redis noch nicht konfiguriert.");
    console.log("  Vercel Dashboard → Integrations → Upstash Redis → Add");
    console.log("  Danach KV_REST_API_URL + KV_REST_API_TOKEN in .env.local eintragen");
    console.log("  und dieses Script erneut ausführen.\n");
  }
}

function redeploy() {
  console.log("→ Production Deploy …");
  try {
    runInherit("npx vercel deploy --prod --yes");
    console.log("✓ Deploy gestartet");
  } catch {
    console.error("✗ Deploy fehlgeschlagen — ggf. manuell: npx vercel deploy --prod");
  }
}

function main() {
  console.log("\nBlumè. — Vercel Push Setup\n");

  const vars = ensureVapidKeys();
  if (!ensureVercelAuth()) process.exit(1);

  ensureProjectLinked();
  setVercelEnv(vars);
  redeploy();

  console.log("\nFertig. Auf dem iPhone: Safari → Teilen → Zum Home-Bildschirm → Benachrichtigungen aktivieren.\n");
}

main();
