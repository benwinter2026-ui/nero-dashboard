import { getSession, discordFetch, json, error } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return error("Nicht angemeldet", 401);
  const response = await discordFetch("/users/@me/guilds?limit=200", session.accessToken);
  if (!response.ok) return error("Discord-Server konnten nicht geladen werden. Bitte erneut anmelden.", 502);
  const all = await response.json();
  const manageable = all.filter(g => {
    try {
      const p = BigInt(g.permissions || "0");
      return (p & 0x8n) === 0x8n || (p & 0x20n) === 0x20n;
    } catch { return false; }
  });
  let botGuildIds = [];
  const raw = await env.NERO_KV.get("bot:guilds");
  try { botGuildIds = raw ? JSON.parse(raw) : []; } catch {}
  const guilds = manageable.map(g => ({
    id: g.id, name: g.name, icon: g.icon || null, owner: !!g.owner, botPresent: botGuildIds.includes(g.id)
  }));
  return json({
    guilds,
    inviteUrl: `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(env.DISCORD_CLIENT_ID || "")}&scope=bot%20applications.commands&permissions=8`
  });
}
