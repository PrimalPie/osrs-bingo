const { Client, GatewayIntentBits, Events } = require('discord.js');
const path = require('path');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { getDb } = require('../db/database');
const { rowColToCoord, COLS } = require('../routes/tiles');

const UPLOAD_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'uploads');

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024; // 10 MB

// Format: A1 - Dragon Legs  (with optional screenshot)
// Optional count suffix: A1 - Dragon Legs x3
const SUBMISSION_REGEX = /^([A-Ia-i][1-9])\s*[-–]\s*(.+?)(?:\s+x(\d+))?$/i;

function parseSubmission(content) {
  const match = content.trim().match(SUBMISSION_REGEX);
  if (!match) return null;
  const col = COLS.indexOf(match[1][0].toUpperCase()) + 1;
  const row = parseInt(match[1][1]);
  return {
    coord: match[1].toUpperCase(),
    row,
    col,
    description: match[2].trim(),
    count: match[3] ? parseInt(match[3]) : 1,
  };
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = url.startsWith('https') ? https : http;
    get.get(url, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function createBot(io) {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.warn('[Bot] DISCORD_BOT_TOKEN not set — Discord bot disabled');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });

  client.once(Events.ClientReady, () => {
    console.log(`[Bot] Logged in as ${client.user.tag}`);
  });

  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    const db = getDb();

    // Find active event
    const event = db.prepare("SELECT * FROM events WHERE status = 'active' LIMIT 1").get();
    if (!event) { console.log('[Bot] No active event, ignoring message'); return; }

    // Find team whose channel matches
    const team = db.prepare(
      'SELECT * FROM teams WHERE event_id = ? AND discord_channel_id = ?'
    ).get(event.id, message.channelId);
    if (!team) return; // not a submission channel, ignore silently

    console.log(`[Bot] Submission channel message from ${message.author.username}: "${message.content.substring(0, 80)}"`);

    const parsed = parseSubmission(message.content);
    if (!parsed) {
      // Only reply if it looks like a submission attempt (starts with a coordinate)
      if (/^[A-Ia-i][1-9]/i.test(message.content.trim())) {
        await message.reply('❓ Invalid format. Use: `A1 - Item name` with a screenshot attached.\nExample: `B3 - Dragon Platelegs` + attach screenshot');
      }
      return;
    }

    // Find the tile
    const tile = db.prepare(
      'SELECT * FROM tiles WHERE event_id = ? AND row = ? AND col = ?'
    ).get(event.id, parsed.row, parsed.col);

    if (!tile) {
      await message.reply(`❌ No tile found at **${parsed.coord}**. Check the board coordinates.`);
      return;
    }

    if (tile.type === 'xp' || (tile.type === 'kc' && tile.wom_competition_id)) {
      const kind = tile.type === 'xp' ? 'XP' : 'KC';
      await message.reply(`ℹ️ **${parsed.coord} — ${tile.label}** is tracked automatically via WiseOldMan (${kind}). No submission needed!`);
      return;
    }

    // Check for duplicate message ID
    const existing = db.prepare('SELECT id FROM submissions WHERE discord_message_id = ?').get(message.id);
    if (existing) return;

    // Save screenshot if attached
    let screenshotPath = null;
    const attachment = message.attachments.first();
    const ALLOWED_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);
    if (attachment && attachment.contentType?.startsWith('image/')) {
      if (attachment.size > MAX_SCREENSHOT_BYTES) {
        await message.reply('⚠️ Screenshot is too large (max 10 MB). Please compress the image and resubmit.');
        return;
      }
      const rawExt = attachment.name?.split('.').pop()?.toLowerCase() || '';
      const ext = ALLOWED_IMAGE_EXTS.has(rawExt) ? rawExt : 'png';
      const filename = `${Date.now()}_${message.id}.${ext}`;
      const dest = path.join(UPLOAD_DIR, filename);
      try {
        await downloadFile(attachment.url, dest);
        screenshotPath = filename;
      } catch (e) {
        console.error('[Bot] Failed to download screenshot:', e.message);
      }
    } else if (tile.type !== 'xp') {
      await message.reply(`⚠️ **${parsed.coord}** requires a screenshot. Please resubmit with an image attached.`);
      return;
    }

    // Get current progress
    const progress = db.prepare(
      'SELECT * FROM tile_progress WHERE tile_id = ? AND team_id = ?'
    ).get(tile.id, team.id);
    const current = progress?.current ?? 0;

    if (current >= tile.target) {
      await message.reply(`✅ **${parsed.coord} - ${tile.label}** is already complete!`);
      return;
    }

    // Insert submission
    db.prepare(`
      INSERT INTO submissions (tile_id, team_id, submitted_by, discord_message_id, screenshot_path, note, count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(tile.id, team.id, message.author.username, message.id, screenshotPath, parsed.description, parsed.count);

    const coord = rowColToCoord(tile.row, tile.col);
    await message.reply(
      `📥 Submission received for **${coord} - ${tile.label}** (${current}/${tile.target}). Awaiting captain approval.`
    );

    // Notify via Socket.io
    if (io) {
      io.emit('new_submission', { team_id: team.id, tile_id: tile.id, coord });
    }
  });

  client.login(token).catch(err => {
    console.error('[Bot] Login failed:', err.message);
  });

  return client;
}

module.exports = { createBot };
