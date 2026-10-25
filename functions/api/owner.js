import { getSession, json, error } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return error("Nicht angemeldet", 401);
  if (!env.OWNER_DISCORD_ID || session.user.id !== env.OWNER_DISCORD_ID) return error("Kein Zugriff auf den Owner-Bereich.", 403);
  const rawGuilds = await env.NERO_KV.get("bot:guilds");
  let botGuildCount = 0;
  try { botGuildCount = rawGuilds ? JSON.parse(rawGuilds).length : 0; } catch {}
  let configCount = 0;
  let cursor;
  do {
    const page = await env.NERO_KV.list({ prefix: "config:", cursor, limit: 100 });
    configCount += page.keys.filter(k => k.name !== "config:index:lastUpdated").length;
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json({ botGuildCount, configCount });
}
