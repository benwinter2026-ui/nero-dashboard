# Nero Bot Dashboard

Cloudflare Pages + Pages Functions + Workers KV + Discord OAuth2.
The Discord bot stays on its existing host. The dashboard does not contain the bot token.

## Important
This is a secure starter implementation, not a magically deployed/live website. You must configure Discord OAuth, Cloudflare Pages, KV, and environment secrets. Settings are saved in KV and the bot bridge downloads them; existing bot modules must be wired to read `data/dashboard-config.json` for those settings to change actual bot behavior.

## 1. Create a GitHub repository
Upload the entire contents of this folder to the root of a new GitHub repository. Do not upload `.dev.vars` or any tokens/secrets.

## 2. Cloudflare Pages
1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Select the repository.
3. Framework preset: `None`.
4. Build command: leave blank.
5. Build output directory: `/`.
6. Deploy.

Pages Functions require Git integration or Wrangler deployment; dashboard Direct Upload does not support Functions.

## 3. Create KV
Cloudflare Dashboard → Storage & databases → KV → Create namespace, e.g. `NERO_DASHBOARD`.
Open Pages project → Settings → Bindings → Add → KV namespace:
- Variable name: `NERO_KV`
- Namespace: `NERO_DASHBOARD`
Save and redeploy.

## 4. Configure Discord OAuth2
Discord Developer Portal → your Nero application → OAuth2 → add Redirect URL:
`https://YOUR-PROJECT.pages.dev/api/auth/callback`
Replace with your actual Pages URL.
Copy the Application ID and Client Secret. Never put the Client Secret in frontend files or GitHub.

Pages project → Settings → Variables and Secrets → Production:
Variables:
- `SITE_URL` = `https://YOUR-PROJECT.pages.dev` (no trailing slash)
- `DISCORD_CLIENT_ID` = Discord Application ID
- `OWNER_DISCORD_ID` = your Discord user ID
Secrets (encrypted):
- `DISCORD_CLIENT_SECRET` = Discord OAuth client secret
- `BOT_SHARED_SECRET` = a long random secret shared only with the bot host

Redeploy after changing bindings/secrets.

The OAuth callback uses `identify guilds`. The app only lets users manage guilds where Discord says they have Administrator or Manage Server permission. The owner area is restricted to `OWNER_DISCORD_ID`.

## 5. Bot host environment
Set these environment variables in the bot host:
- `DASHBOARD_API_URL` = `https://YOUR-PROJECT.pages.dev`
- `DASHBOARD_SHARED_SECRET` = exactly the same value as Cloudflare `BOT_SHARED_SECRET`

Copy `bot/dashboard-bridge.js` into the bot project's folder. In the existing bot `index.js`, after creating the Discord client and before/after `client.login(...)`, add before `client.login(...)`:
```js
const { startDashboardBridge } = require("./dashboard-bridge");
startDashboardBridge(client);
```
Do not create a second Discord client. The bridge uses the existing `client`.

Restart the bot. It posts its guild list to the dashboard and downloads each guild's saved config every 60 seconds to `data/dashboard-config.json`.

## 6. What the starter settings do
The dashboard stores:
- Welcome enabled, channel ID, message
- Ticket enabled, panel channel ID, support role ID
- Moderation enabled
- Log channel ID

The bridge downloads these values to JSON. Your existing welcome/ticket/moderation modules must read this JSON (or a shared config loader) to apply changes. The dashboard cannot safely guess your module APIs, so it does not silently rewrite your existing modules.

## 7. Google indexing
The public landing page includes title, description, canonical URL (set in `index.html`), Open Graph tags, `robots.txt`, and `sitemap.xml`.
After deploying:
1. Replace `YOUR-PROJECT.pages.dev` in `index.html`, `robots.txt`, and `sitemap.xml` with your real domain.
2. Commit and push the changes.
3. Open Google Search Console, add/verify your domain or URL-prefix property, and submit `https://YOUR-PROJECT.pages.dev/sitemap.xml`.
4. Request indexing for the homepage.
Indexing is not instant or guaranteed. Keep the landing page publicly accessible; the dashboard API remains protected.

## Troubleshooting
- `KV not configured`: bind the KV namespace using the exact name `NERO_KV`, then redeploy.
- OAuth `redirect_uri` error: the Discord callback URL must exactly match the URL in Discord Developer Portal and `SITE_URL`.
- `BOT_SHARED_SECRET` error: ensure the Cloudflare secret and bot host environment variable match exactly.
- No guilds: log in with a user account that has Administrator or Manage Server permission.
- Settings save but do not affect bot behavior: wire the bot's existing modules to read `data/dashboard-config.json`.
