# Drop Watcher

Watches for restocks and drops and pushes them to my phone through ntfy.

- **Watch Tower:** specific products (Best Buy, Walmart, any Shopify store, any site with schema.org product data). Push when one goes from sold out to in stock.
- **Pokemon Drops:** sealed Pokemon stock at six Edmonton card shops plus Walmart's and Best Buy's own listings. Push on any new listing or restock you could buy right now.
- **Buzz / news:** PokeBeach, RedFlagDeals, Reddit (best effort) and sneaker news, filtered by keyword lists.

## How it runs

| Job | Schedule | What it does |
|---|---|---|
| `engine.yml` | every 5 min | `npm run watch`, then `npm run drops` |
| `feeds.yml` | every 30 min | `npm run feeds` |
| `keepalive.yml` | weekly | stops GitHub disabling the schedules after 60 quiet days |
| `probe.yml` | manual | reads every source from GitHub's network, no writes |

GitHub's cron can start a few minutes late, so a 2-minute sellout can still be missed.

State lives in Supabase (`db/*.sql`, run in order in the SQL Editor). The first run for any shop or feed only records what's there; alerts start from the second run.

## Secrets

Set in GitHub → Settings → Secrets and variables → Actions, and in a local `.env` (see `.env.example`):

- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`
- `NTFY_TOPIC`: the private ntfy channel. It works like a password; never commit it.

## Local

```bash
npm install
npm run probe   # live read of known products and every source, no writes
npm run watch   # Watch Tower check
npm run drops   # Pokemon diff
npm run feeds   # news collection
```

Without `NTFY_TOPIC` set, alerts print to the console instead of sending.

## Sources that don't work

From GitHub's (US) servers: Walmart answers only some of the time (treated as best effort, failures stay quiet), and dysoncanada.ca blocks outright, so watch Dyson products through Best Buy instead. Shopify stores are asked for the Canadian catalog (`country=CA`), since some hide products from US visitors.

Everywhere: EB Games, Pokemon Center CA and London Drugs return 403. Costco serves a bot check. Facebook groups and Discord have no legitimate access. Best Buy's Pokemon listings are almost all marketplace resellers, which are filtered out.
