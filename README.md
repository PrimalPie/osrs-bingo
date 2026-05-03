# OSRS Clan Bingo

A self-hosted bingo event manager for Old School RuneScape clans. Teams submit drops and boss kills via Discord, captains review them in a web dashboard, and everyone watches the board update live.

![Board view showing a 9×9 bingo grid with team progress](https://raw.githubusercontent.com/PrimalPie/osrs-bingo/main/docs/preview.png)

## Features

- **Live bingo board** — tile progress updates in real-time via WebSockets
- **Discord bot** — players post `A1 - Dragon claws` with a screenshot in their team channel; the bot handles the rest
- **Captain review** — captains approve or reject submissions, with optional count adjustment
- **WiseOldMan integration** — XP and KC tiles can be tracked automatically via [WOM](https://wiseoldman.net) competitions (syncs every 3 minutes)
- **Multi-team support** — each team has its own Discord channel, captain account, and progress
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
- Attach a **screenshot** (required for drop and KC tiles)
- `x2`, `x3` etc. to claim multiple at once

The bot confirms receipt. Captains review pending submissions at `/captain`.

---

## WiseOldMan integration

XP tiles and KC tiles with a competition ID are tracked automatically — no screenshot needed.

1. Create a competition on https://wiseoldman.net covering your bingo dates
2. Add all participating players
3. In the **Tiles** tab, paste the WOM competition ID directly onto each tile (XP or KC)
4. Progress syncs every 3 minutes

For large inter-clan events with a single WOM board, use the **Preview As** feature on WOM to find the per-metric competition ID and assign it to the relevant tile.

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_BOT_TOKEN` | Yes | Token from discord.com/developers |
| `JWT_SECRET` | Yes | Long random string for signing JWTs |
| `PORT` | No | API port (default `3001`) |
| `CLIENT_URL` | No | Frontend origin for CORS (default `http://localhost:5173`) |
| `DATA_DIR` | No | Override data directory for DB and uploads (used by Docker) |

---

## Admin panel overview

| Tab | What it does |
|---|---|
| Events | Create events, set board size, activate / complete / delete |
| Tiles | Add tiles with coordinate, type (drop / kc / xp), target count, WOM competition ID |
| Teams | Create teams, set Discord channel, add members |
| Users | Create captain and admin accounts, assign to teams |
| Audit | Full log of all admin and captain actions |

---

## License

MIT
