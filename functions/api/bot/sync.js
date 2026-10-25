import { requireBotSecret, json, error } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  if (!requireBotSecret(request, env)) return error("Unauthorized", 401);
  if (!env.NERO_KV) return error("KV nicht konfiguriert.", 500);
  let body;
  try { body = await request.json(); } catch { return error("Ungültiges JSON."); }
  if (!Array.isArray(body.guildIds) || body.guildIds.length > 2500) return error("guildIds muss ein Array mit höchstens 2500 IDs sein.");
  const ids = [...new Set(body.guildIds.filter(id => typeof id === "string" && /^\d{17,20}$/.test(id)))];
  await env.NERO_KV.put("bot:guilds", JSON.stringify(ids));
  await env.NERO_KV.put("bot:lastSeen", String(Date.now()));
  return json({ ok: true, count: ids.length });
}
