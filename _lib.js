export const json = (data, status = 200, extraHeaders = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...extraHeaders }
  });

export const error = (message, status = 400) => json({ error: message }, status);

export function cookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const item of raw.split(";")) {
    const [key, ...rest] = item.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}
export function setCookie(name, value, maxAge = 86400) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export function clearCookie(name) {
  return `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
export function randomToken(bytes = 32) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, "0")).join("");
}
export async function getSession(request, env) {
  const sid = cookie(request, "nero_session");
  if (!sid || !env.NERO_KV) return null;
  const raw = await env.NERO_KV.get(`session:${sid}`);
  if (!raw) return null;
  try { return { sid, ...(JSON.parse(raw)) }; } catch { return null; }
}
export function requireCsrf(request, session) {
  return !!session && !!session.csrfToken && request.headers.get("X-CSRF-Token") === session.csrfToken;
}
export async function discordFetch(path, token, init = {}) {
  return fetch(`https://discord.com/api/v10${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) }
  });
}
export function defaultConfig() {
  return {
    welcome: { enabled: false, channelId: "", message: "Willkommen {user} auf {server}!" },
    tickets: { enabled: false, panelChannelId: "", supportRoleId: "" },
    moderation: { enabled: false },
    logChannelId: ""
  };
}
export function validSnowflake(value, optional = true) {
  if (value === "" && optional) return true;
  return typeof value === "string" && /^\d{17,20}$/.test(value);
}
export function cleanConfig(input) {
  if (!input || typeof input !== "object") throw new Error("Ungültige Konfiguration.");
  const c = {
    welcome: {
      enabled: !!input.welcome?.enabled,
      channelId: String(input.welcome?.channelId || "").trim(),
      message: String(input.welcome?.message ?? "").slice(0, 1500)
    },
    tickets: {
      enabled: !!input.tickets?.enabled,
      panelChannelId: String(input.tickets?.panelChannelId || "").trim(),
      supportRoleId: String(input.tickets?.supportRoleId || "").trim()
    },
    moderation: { enabled: !!input.moderation?.enabled },
    logChannelId: String(input.logChannelId || "").trim()
  };
  for (const id of [c.welcome.channelId, c.tickets.panelChannelId, c.tickets.supportRoleId, c.logChannelId]) {
    if (!validSnowflake(id)) throw new Error("Kanal- und Rollen-IDs müssen gültige Discord-IDs sein (oder leer bleiben).");
  }
  if (c.welcome.enabled && !c.welcome.channelId) throw new Error("Wähle eine Willkommenskanal-ID oder deaktiviere das Willkommenssystem.");
  if (c.tickets.enabled && (!c.tickets.panelChannelId || !c.tickets.supportRoleId)) throw new Error("Für Tickets werden Panel-Kanal-ID und Support-Rollen-ID benötigt.");
  return c;
}
export async function canManageGuild(session, guildId) {
  const response = await discordFetch("/users/@me/guilds?limit=200", session.accessToken);
  if (!response.ok) return false;
  const list = await response.json();
  const guild = list.find(g => g.id === guildId);
  if (!guild) return false;
  try {
    const permissions = BigInt(guild.permissions || "0");
    return (permissions & 0x8n) === 0x8n || (permissions & 0x20n) === 0x20n;
  } catch { return false; }
}
export async function isBotGuild(env, guildId) {
  const raw = await env.NERO_KV.get("bot:guilds");
  if (!raw) return false;
  try { return JSON.parse(raw).includes(guildId); } catch { return false; }
}
export function requireBotSecret(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return !!env.BOT_SHARED_SECRET && token.length > 0 && token === env.BOT_SHARED_SECRET;
}
