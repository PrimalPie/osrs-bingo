# OSRS Clan Bingo — Setup Guide

## Requirements
- Node.js 22+
- A Discord bot token (from https://discord.com/developers/applications)

---

## 1. Install dependencies

```bash
cd osrs-bingo
npm run install:all
```

## 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:
```
DISCORD_BOT_TOKEN=your_bot_token_here
JWT_SECRET=any_random_string_here
PORT=3001
CLIENT_URL=http://localhost:5173
```

## 3. Discord bot setup

1. Go to https://discord.com/developers/applications → New Application
2. Bot tab → Add Bot → copy the token into `.env`
3. Bot tab → enable **Message Content Intent**
4. OAuth2 → URL Generator → check `bot` scope + permissions:
   - Read Messages/View Channels
   - Send Messages
   - Read Message History
5. Paste the generated URL in your browser to invite the bot to your server
6. Get each team's submission channel ID (right-click channel → Copy Channel ID)

## 4. Start the app

**Two terminals:**

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

Open http://localhost:5173

## 5. First-time setup

### Create admin account
```bash
curl -X POST http://localhost:3001/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}'
```
*(Only works once — subsequent calls are rejected)*

### In the Admin panel (login at /login):

1. **Events tab** — create your bingo event, optionally add a WiseOldMan competition ID for XP tiles
2. **Tiles tab** — select your event, add all 81 tiles:
   - Coord: `A1` through `I9`
   - Type: `drop`, `kc`, or `xp`
   - Target: how many are needed (e.g. 6 for "6 CoX purples")
   - WOM Metric: skill name for XP tiles (e.g. `fletching`, `hunter`, `slayer`, `runecraft`)
3. **Teams tab** — create teams, paste in each team's Discord submission channel ID, add members
4. **Users tab** — create captain accounts (one per team), assign to their team
5. **Events tab** — click **Activate** when ready to start

---

## Submission format (Discord)

Players post in their team's submission channel:
```
A1 - Dragon claws
B3 - Armadyl hilt x2
```
- Coordinate first, then a dash, then the item/description
- Attach a **screenshot** (required for drop and kc tiles)
- `x2`, `x3` etc. to claim multiple in one post

The bot will confirm receipt. Captains then review at `/captain`.

---

## WiseOldMan XP tiles

1. Create a competition on https://wiseoldman.net for the duration of your bingo
2. Add your players to it
3. Paste the competition ID into the event settings
4. For each XP tile, set the WOM metric to the skill name (lowercase): `fletching`, `hunter`, `slayer`, `runecraft`, etc.
5. XP progress syncs automatically every 3 minutes

---

## Winning

The public board at `/` updates live for everyone. First team to complete all tiles wins.
The admin can mark the event complete from the Events tab.
