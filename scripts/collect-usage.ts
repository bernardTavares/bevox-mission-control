#!/usr/bin/env tsx
/**
 * Collect Usage Script
 * 
 * Collects current OpenClaw usage data and stores it in SQLite
 * Run manually or via cron
 */

import path from "path";
import { collectUsage } from "../src/lib/usage-collector";
import os from "os";

function resolveDbPath(): string {
  const envPath = process.env.USAGE_DB_PATH;
  if (envPath && envPath.length > 0) {
    return envPath;
  }
  const home = process.env.HOME || os.homedir();
  return path.join(home, ".openclaw", "cost", "usage-tracking.db");
}

const DB_PATH = resolveDbPath();

async function main() {
  console.log("🦞 Mission Control - Usage Collector");
  console.log(`Database: ${DB_PATH}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log();

  try {
    await collectUsage(DB_PATH);
    console.log("✅ Usage data collected successfully");
  } catch (error) {
    console.error("❌ Error collecting usage data:", error);
    process.exit(1);
  }
}

main();
