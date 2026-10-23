// Nero Bot Dashboard Bridge — Discord.js v14, CommonJS.
// Requires the existing Discord client. Does not create a second client.
const fs = require("node:fs");
const path = require("node:path");

function startDashboardBridge(client) {
  const apiBase = (process.env.DASHBOARD_API_URL || "").replace(/\/$/, "");
  const secret = process.env.DASHBOARD_SHARED_SECRET || "";
  if (!apiBase || !secret) {
    console.warn("[Nero Dashboard] DASHBOARD_API_URL or DASHBOARD_SHARED_SECRET missing; bridge disabled.");
    return;
  }
  const dataDir = path.join(process.cwd(), "data");
  const outputFile = path.join(dataDir, "dashboard-config.json");
  let busy = false;

  async function request(endpoint, options = {}) {
    const response = await fetch(`${apiBase}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`HTTP ${response.status}: ${text.slice(0, 180)}`);
    }
    return response.json();
  }

  async function sync() {
    if (busy || !client.isReady()) return;
    busy = true;
    try {
      const guildIds = [...client.guilds.cache.keys()];
      await request("/api/bot/sync", {
        method: "POST",
        body: JSON.stringify({ guildIds })
      });
      const configs = {};
      for (const guildId of guildIds) {
        try {
          const data = await request(`/api/bot/config?guild_id=${encodeURIComponent(guildId)}`);
          configs[guildId] = data.config;
        } catch (err) {
          console.warn(`[Nero Dashboard] Could not fetch config for guild ${guildId}:`, err.message);
        }
      }
      fs.mkdirSync(dataDir, { recursive: true });
      const temp = `${outputFile}.tmp`;
      fs.writeFileSync(temp, JSON.stringify({ updatedAt: new Date().toISOString(), guilds: configs }, null, 2), "utf8");
      fs.renameSync(temp, outputFile);
      console.log(`[Nero Dashboard] Synced ${Object.keys(configs).length} guild configurations.`);
    } catch (err) {
      console.error("[Nero Dashboard] Sync failed:", err.message);
    } finally {
      busy = false;
    }
  }

  client.once("ready", () => {
    sync();
    setInterval(sync, 60_000);
  });
  client.on("guildCreate", sync);
  client.on("guildDelete", sync);
}
module.exports = { startDashboardBridge };
