import { requireBotSecret, defaultConfig, json, error } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  if (!requireBotSecret(request, env)) return error("Unauthorized", 401);
  const guildId = new URL(request.url).searchParams.get("guild_id") || "";
  if (!/^\d{17,20}$/.test(guildId)) return error("Ungültige Server-ID.");
  let config = defaultConfig();
  const raw = await env.NERO_KV.get(`config:${guildId}`);
  if (raw) {
    try { config = { ...config, ...JSON.parse(raw) }; } catch {}
  }
  return json({ guildId, config, fetchedAt: Date.now() });
}
