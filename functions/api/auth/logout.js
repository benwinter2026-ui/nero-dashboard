import { getSession, requireCsrf, clearCookie, json, error } from "../../_lib.js";

export async function onRequestPost({ request, env }) {
  const session = await getSession(request, env);
  if (session && !requireCsrf(request, session)) return error("CSRF-Prüfung fehlgeschlagen.", 403);
  if (session) await env.NERO_KV.delete(`session:${session.sid}`);
  return json({ ok: true }, 200, { "Set-Cookie": clearCookie("nero_session") });
}
