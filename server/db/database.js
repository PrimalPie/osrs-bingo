const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const schema = require('./schema');

const DB_PATH = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'bingo.db')
  : path.join(__dirname, '..', 'bingo.db');

let _db = null;

// Thin wrapper that adds a transaction() helper matching better-sqlite3's API
class BingoDb {
  constructor(dbSync) {
    this._db = dbSync;
  }

  exec(sql) { return this._db.exec(sql); }

  prepare(sql) { return this._db.prepare(sql); }

  transaction(fn) {
    const db = this._db;
    return function transact(...args) {
      db.exec('BEGIN');
      try {
        const result = fn(...args);
        db.exec('COMMIT');
        return result;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    };
  }
}

function getDb() {
  if (!_db) {
    const raw = new DatabaseSync(DB_PATH);
    raw.exec('PRAGMA journal_mode = WAL');
    raw.exec('PRAGMA foreign_keys = ON');
    raw.exec(schema);

    // Migrations for existing databases
    const eventCols = raw.prepare("PRAGMA table_info(events)").all().map(r => r.name);
    if (!eventCols.includes('board_size')) {
      raw.exec('ALTER TABLE events ADD COLUMN board_size INTEGER NOT NULL DEFAULT 9');
    }
    if (!eventCols.includes('start_date')) {
      raw.exec('ALTER TABLE events ADD COLUMN start_date TEXT');
    }
    if (!eventCols.includes('end_date')) {
      raw.exec('ALTER TABLE events ADD COLUMN end_date TEXT');
    }
    if (!eventCols.includes('mode')) {
      raw.exec("ALTER TABLE events ADD COLUMN mode TEXT NOT NULL DEFAULT 'blackout'");
    }
    const tileCols = raw.prepare("PRAGMA table_info(tiles)").all().map(r => r.name);
    if (!tileCols.includes('icon_url')) {
      raw.exec('ALTER TABLE tiles ADD COLUMN icon_url TEXT');
    }
    if (!tileCols.includes('wom_competition_id')) {
      raw.exec('ALTER TABLE tiles ADD COLUMN wom_competition_id INTEGER');
    }

    _db = new BingoDb(raw);
  }
  return _db;
}

module.exports = { getDb };
