import { randomToken, cookie, setCookie, clearCookie, error } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const savedState = cookie(request, "nero_oauth_state");
  if (url.searchParams.has("error")) return Response.redirect(`${env.SITE_URL}/?error=discord_denied`, 302);
  if (!code || !state || !savedState || state !== savedState) return error("OAuth-State ungültig. Bitte erneut anmelden.", 400);
  if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET || !env.SITE_URL || !env.NERO_KV) return error("OAuth/KV-Konfiguration unvollständig.", 500);

  const redirectUri = `${env.SITE_URL.replace(/\/$/, "")}/api/auth/callback`;
  const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      client_secret: env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri
    })
  });
  const tokenData = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !tokenData.access_token) return error("Discord konnte die Anmeldung nicht abschließen.", 502);

  const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` }
  });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user.id) return error("Discord-Profil konnte nicht geladen werden.", 502);

  const sid = randomToken(32);
  const session = {
    user: { id: user.id, username: user.username, global_name: user.global_name || null, avatar: user.avatar || null },
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token || null,
    expiresAt: Date.now() + (Number(tokenData.expires_in || 604800) * 1000),
    csrfToken: randomToken(24),
    createdAt: Date.now()
  };
  await env.NERO_KV.put(`session:${sid}`, JSON.stringify(session), { expirationTtl: Math.max(600, Number(tokenData.expires_in || 604800)) });
  const headers = new Headers({
    Location: `${env.SITE_URL.replace(/\/$/, "")}/?login=success`,
    "Cache-Control": "no-store"
  });
  headers.append("Set-Cookie", setCookie("nero_session", sid, Number(tokenData.expires_in || 604800)));
  headers.append("Set-Cookie", clearCookie("nero_oauth_state"));
  return new Response(null, { status: 302, headers });
}
