# OSRS Clan Bingo

A self-hosted bingo event manager for Old School RuneScape clans. Teams submit drops and boss kills via Discord, captains review them in a web dashboard, and everyone watches the board update live.

<img width="1423" height="854" alt="image" src="https://github.com/user-attachments/assets/83db75aa-a5e1-4cec-b7d1-bc408fdf8011" />


## Features

- **Live bingo board** — tile progress updates in real-time via WebSockets
- **Discord bot** — players post `A1 - Dragon claws` with a screenshot in their team channel; the bot handles the rest
- **Captain review** — captains approve or reject submissions with optional count adjustment
- **WiseOldMan integration** — XP and KC tiles tracked automatically via a single WOM competition; each tile just sets a metric (e.g. `zulrah`, `fletching`). Syncs every 3 hours with a manual Sync Now button in the admin panel
- **Board generator** — admin sandbox that generates a full board from a curated tile pool; targets scale by team size and event length, preview before applying
- **Event scheduling** — set start and end datetimes (UTC); the board shows a live countdown to the next event in each viewer's local timezone
- **Multi-team support** — each team has its own Discord channel, captain account, and progress overlay
- **Admin panel** — manage events, tiles, teams, and users; full audit log
- **Configurable board size** — 3×3 up to 12×12
- **Changelog page** — public record of app updates at `/changelog`

## Tech stack

- **Backend** — Node.js, Express, `node:sqlite` (no separate DB server needed)
- **Frontend** — React 18, Vite, React Router, Socket.IO client
- **Bot** — discord.js v14
- **Auth** — JWT + bcrypt

---

## Quick start (local dev)

### 1. Install dependencies

```bash
npm run install:all
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
DISCORD_BOT_TOKEN=your_bot_token_here
JWT_SECRET=any_long_random_string
PORT=3001
CLIENT_URL=http://localhost:5173
```

### 3. Start

```bash
# Terminal 1 — API + bot
cd server && npm run dev

# Terminal 2 — React dev server
cd client && npm run dev
```

Open http://localhost:5173

### 4. Create the first admin account

```bash
curl -X POST http://localhost:3001/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```

This endpoint only works once.

---

## Docker (self-hosting)

```bash
cp .env.example .env
# fill in .env values

docker-compose up -d --build
```

The app will be available on port `3100` (configurable in `docker-compose.yml`). Data is persisted in a named volume at `/app/data`.

> **Note:** Always use `--build` when deploying code changes. `docker-compose restart` alone does not rebuild the image and will keep running the old code.

---

## Discord bot setup

1. Go to https://discord.com/developers/applications → **New Application**
2. **Bot** tab → **Add Bot** → copy the token into `.env`
3. **Bot** tab → enable **Message Content Intent**
4. **OAuth2 → URL Generator** → scope: `bot`, permissions:
   - Read Messages / View Channels
   - Send Messages
   - Read Message History
5. Paste the generated invite URL into your browser to add the bot to your server
6. In the Admin panel, paste each team's Discord channel ID (right-click channel → **Copy Channel ID**)

### Submission format

Players post in their team's submission channel:

```
A1 - Dragon claws
B3 - Armadyl hilt x2
```

- Coordinate first, dash, then the item or description
- Attach a **screenshot** (required for drop tiles)
- `x2`, `x3` etc. to claim multiple at once

The bot confirms receipt. Captains review pending submissions at `/captain`.

---

## WiseOldMan integration

XP and KC tiles can be tracked automatically — no screenshot needed.

### Setup

1. Create a competition on https://wiseoldman.net covering your bingo dates and add all participating players
2. In the admin **Events** tab, paste the WOM competition ID into the event (not per-tile)
3. On each XP or KC tile, set the **WOM Metric** field to the relevant skill or boss slug (e.g. `zulrah`, `fletching`, `barrows_chests`)
4. The app fetches gains for each unique metric from that single competition using `?metric=<slug>` — no separate competition per tile needed
5. Progress syncs every 3 hours; use **Sync Now** in the Events tab for an immediate update

### Metric slugs

Use lowercase with underscores matching the WOM API — the tile editor auto-suggests the slug from the tile label. Common overrides: `runecraft` → `runecrafting`, `barrows` → `barrows_chests`.

### Per-tile competition override

Set `wom_competition_id` directly on a tile to pull from a different competition than the event default. Useful if a tile covers content from a separate WOM event.

### API key

WOM's free tier allows 20 requests/min. To raise this to 100 requests/min, get a free API key from the WOM Discord and add it to `.env`:

```
WOM_API_KEY=your_key_here
```

Then `docker-compose restart` (env-only change, no rebuild needed).

---

## Board generator

Admins can generate a full board automatically at `/generate`:

- Set total players, number of teams (team size is computed), board size, and event duration
- Tune the difficulty mix (easy / medium / hard %) and category mix (PvM / Skilling / Collection %)
- Toggle **WOM-tracked only** to exclude manual drop tiles
- Targets scale by team size and duration:
  - XP tiles — linear with team size and days
  - KC tiles — square-root scaling (diminishing returns for large teams)
  - Rare drops — fixed (always 1)
- Preview the colour-coded grid, review the full tile list, then apply directly to any event

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Yes | Token from discord.com/developers |
| `JWT_SECRET` | Yes | Long random string for signing JWTs |
| `PORT` | No | API port (default `3001`) |
| `CLIENT_URL` | No | Frontend origin for CORS (default `http://localhost:5173`) |
| `DATA_DIR` | No | Override data directory for DB, uploads, and icon cache (used by Docker) |
| `WOM_API_KEY` | No | WOM API key — raises rate limit from 20 to 100 req/min |

---

## Admin panel overview

| Tab | What it does |
|---|---|
| Events | Create events with board size and start/end datetimes (UTC); activate, complete, edit, or delete |
| Tiles | Add tiles with coordinate, type (drop / kc / xp), target, WOM metric, and icon |
| Teams | Create teams, set Discord channel, add members |
| Users | Create captain and admin accounts, assign to teams |
| Audit | Full log of all admin and captain actions |
| Generate | Auto-generate a board from a curated tile pool with scaling targets |

---

## License

MIT
