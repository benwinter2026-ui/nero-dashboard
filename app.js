const $ = (id) => document.getElementById(id);
let csrfToken = "";
let guilds = [];
let selectedGuild = null;
let botInviteUrl = "#";

function showNotice(message) {
  const el = $("notice");
  el.textContent = message;
  el.hidden = false;
}
function hideNotice() { $("notice").hidden = true; }
async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (options.method && options.method !== "GET" && csrfToken) headers["X-CSRF-Token"] = csrfToken;
  const response = await fetch(path, { credentials: "same-origin", ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Anfrage fehlgeschlagen (${response.status})`);
  return body;
}
function showDashboard(me) {
  $("dashboard").classList.remove("hidden");
  $("features").classList.add("hidden");
  $("username").textContent = me.user.global_name || me.user.username;
  $("avatar").textContent = (me.user.username || "N").slice(0,1).toUpperCase();
  if (me.user.avatar) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = `https://cdn.discordapp.com/avatars/${me.user.id}/${me.user.avatar}.png?size=64`;
    $("avatar").replaceChildren(img);
  }
  if (me.isOwner) {
    $("owner-panel").classList.remove("hidden");
    loadOwnerInfo();
  }
}
function iconUrl(guild) {
  return guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64` : null;
}
function renderGuilds() {
  $("server-count").textContent = String(guilds.length);
  const list = $("guild-list");
  list.replaceChildren();
  if (!guilds.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "Keine verwaltbaren Server gefunden. Prüfe deine Discord-Serverrechte.";
    list.append(p);
    return;
  }
  for (const guild of guilds) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "guild-button" + (selectedGuild?.id === guild.id ? " active" : "");
    const icon = document.createElement("span");
    icon.className = "guild-icon";
    if (iconUrl(guild)) {
      const img = document.createElement("img"); img.src = iconUrl(guild); img.alt = ""; icon.append(img);
    } else icon.textContent = guild.name.slice(0,1).toUpperCase();
    const labels = document.createElement("span"); labels.style.minWidth = "0";
    const name = document.createElement("span"); name.className = "guild-name"; name.textContent = guild.name;
    const sub = document.createElement("span"); sub.className = "guild-sub"; sub.textContent = guild.botPresent ? "Nero Bot verbunden" : "Bot nicht hinzugefügt";
    labels.append(name, document.createElement("br"), sub);
    button.append(icon, labels);
    button.addEventListener("click", () => selectGuild(guild));
    list.append(button);
  }
}
async function loadGuilds() {
  const data = await api("/api/guilds");
  guilds = data.guilds || [];
  botInviteUrl = data.inviteUrl || "#";
  renderGuilds();
}
async function selectGuild(guild) {
  selectedGuild = guild;
  renderGuilds();
  $("empty-state").classList.add("hidden");
  $("settings-view").classList.remove("hidden");
  $("selected-guild-name").textContent = guild.name;
  $("bot-state").textContent = guild.botPresent ? "Bot verbunden" : "Bot fehlt";
  $("bot-state").style.color = guild.botPresent ? "#a3edca" : "#ffdca1";
  $("bot-missing").classList.toggle("hidden", guild.botPresent);
  $("invite-link").href = botInviteUrl;
  $("settings-fields").disabled = !guild.botPresent;
  $("save-status").textContent = "Lade Einstellungen …";
  try {
    const data = await api(`/api/config?guild_id=${encodeURIComponent(guild.id)}`);
    const c = data.config;
    $("welcome-enabled").checked = !!c.welcome.enabled;
    $("welcome-channel").value = c.welcome.channelId || "";
    $("welcome-message").value = c.welcome.message || "";
    $("tickets-enabled").checked = !!c.tickets.enabled;
    $("ticket-channel").value = c.tickets.panelChannelId || "";
    $("support-role").value = c.tickets.supportRoleId || "";
    $("moderation-enabled").checked = !!c.moderation.enabled;
    $("log-channel").value = c.logChannelId || "";
    $("save-status").textContent = "";
  } catch (e) { $("save-status").textContent = e.message; }
}
$("settings-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedGuild) return;
  const config = {
    welcome: { enabled: $("welcome-enabled").checked, channelId: $("welcome-channel").value.trim(), message: $("welcome-message").value },
    tickets: { enabled: $("tickets-enabled").checked, panelChannelId: $("ticket-channel").value.trim(), supportRoleId: $("support-role").value.trim() },
    moderation: { enabled: $("moderation-enabled").checked },
    logChannelId: $("log-channel").value.trim()
  };
  $("save-status").textContent = "Speichere …";
  try {
    await api(`/api/config?guild_id=${encodeURIComponent(selectedGuild.id)}`, { method: "PUT", body: JSON.stringify({ config }) });
    $("save-status").textContent = "Gespeichert. Der Bot synchronisiert die Werte innerhalb von ca. 60 Sekunden.";
  } catch (e) { $("save-status").textContent = e.message; }
});
async function loadOwnerInfo() {
  try {
    const data = await api("/api/owner");
    $("owner-info").textContent = `Registrierte Bot-Server: ${data.botGuildCount}. Gespeicherte Server-Konfigurationen: ${data.configCount}.`;
  } catch (e) { $("owner-info").textContent = e.message; }
}
$("login-button").addEventListener("click", () => { window.location.href = "/api/auth/login"; });
$("logout-button").addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST", body: "{}" }); }
  finally { window.location.reload(); }
});
$("year").textContent = new Date().getFullYear();

(async function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.has("error")) showNotice("Discord-Anmeldung fehlgeschlagen: " + params.get("error"));
  if (params.has("login")) showNotice("Du bist jetzt angemeldet.");
  try {
    const me = await api("/api/me");
    if (me.authenticated) {
      csrfToken = me.csrfToken;
      hideNotice();
      showDashboard(me);
      await loadGuilds();
    }
  } catch (e) {
    if (e.message !== "Nicht angemeldet") showNotice(e.message);
  }
})();
