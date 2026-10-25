import { json, randomToken, setCookie, error } from "../../_lib.js";

export async function onRequestGet({ request, env }) {
  if (!env.DISCORD_CLIENT_ID || !env.SITE_URL) return error("OAuth-Konfiguration fehlt.", 500);
  const state = randomToken(24);
  const redirectUri = `${env.SITE_URL.replace(/\/$/, "")}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: env.DISCORD_CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "identify guilds",
    state,
    prompt: "consent"
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `https://discord.com/oauth2/authorize?${params}`,
      "Cache-Control": "no-store",
      "Set-Cookie": setCookie("nero_oauth_state", state, 600)
    }
  });
}
