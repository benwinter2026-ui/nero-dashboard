import { getSession, json, error } from "../_lib.js";

export async function onRequestGet({ request, env }) {
  const session = await getSession(request, env);
  if (!session) return error("Nicht angemeldet", 401);
  if (session.expiresAt && session.expiresAt < Date.now()) {
    await env.NERO_KV.delete(`session:${session.sid}`);
    return error("Sitzung abgelaufen. Bitte erneut anmelden.", 401);
  }
  return json({
    authenticated: true,
    user: session.user,
    csrfToken: session.csrfToken,
    isOwner: !!env.OWNER_DISCORD_ID && session.user.id === env.OWNER_DISCORD_ID
  });
}
