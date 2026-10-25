import { getSession, requireCsrf, canManageGuild, isBotGuild, defaultConfig, cleanConfig, json, error } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return error("Nicht angemeldet", 401);
  const guildId = new URL(request.url).searchParams.get("guild_id") || "";
  if (!/^\d{17,20}$/.test(guildId)) return error("Ungültige Server-ID.");
  if (!(await canManageGuild(session, guildId))) return error("Du darfst diesen Server nicht verwalten.", 403);
  if (!(await isBotGuild(env, guildId))) return error("Nero Bot ist auf diesem Server noch nicht verbunden.", 409);
  let config = defaultConfig();
  const raw = await env.NERO_KV.get(`config:${guildId}`);
  if (raw) {
    try { config = { ...config, ...JSON.parse(raw) }; } catch {}
  }
  config.welcome = { ...defaultConfig().welcome, ...(config.welcome || {}) };
  config.tickets = { ...defaultConfig().tickets, ...(config.tickets || {}) };
  config.moderation = { ...defaultConfig().moderation, ...(config.moderation || {}) };
  return json({ guildId, config });
}

export async function onRequestPut({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return error("Nicht angemeldet", 401);
  if (!requireCsrf(request, session)) return error("CSRF-Prüfung fehlgeschlagen.", 403);
  const guildId = new URL(request.url).searchParams.get("guild_id") || "";
  if (!/^\d{17,20}$/.test(guildId)) return error("Ungültige Server-ID.");
  if (!(await canManageGuild(session, guildId))) return error("Du darfst diesen Server nicht verwalten.", 403);
  if (!(await isBotGuild(env, guildId))) return error("Nero Bot ist auf diesem Server noch nicht verbunden.", 409);
  let body;
  try { body = await request.json(); } catch { return error("Ungültiges JSON."); }
  let config;
  try { config = cleanConfig(body.config); } catch (e) { return error(e.message, 400); }
  await env.NERO_KV.put(`config:${guildId}`, JSON.stringify(config));
  await env.NERO_KV.put("config:index:lastUpdated", JSON.stringify({ guildId, updatedAt: Date.now(), updatedBy: session.user.id }));
  return json({ ok: true, config });
}
