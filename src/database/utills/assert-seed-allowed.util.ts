export function assertSeedAllowed() {
  const env = process.env.NODE_ENV;
  const enabled = process.env.SEED_ENABLED === "true";

  if (env !== "development" || !enabled) {
    throw new Error("❌ Seed is not allowed in this environment");
  }
}
