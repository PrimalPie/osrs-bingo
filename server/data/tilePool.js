// Curated tile pool for the board generator.
// baseTarget is calibrated for 10 players and a 7-day event.
// scaling: linear (XP), sqrt (KC boss), partial (common drops), fixed (rare drops/static)

module.exports = [
  // ── PvM · Easy ─────────────────────────────────────────────────────────────
  { label: 'Barrows Chests',              category: 'pvm', difficulty: 'easy',   type: 'kc',   wom_metric: 'barrows_chests',          baseTarget: 50,  scaling: 'sqrt' },
  { label: 'Giant Mole Kills',            category: 'pvm', difficulty: 'easy',   type: 'kc',   wom_metric: 'giant_mole',              baseTarget: 20,  scaling: 'sqrt' },
  { label: 'King Black Dragon Kills',     category: 'pvm', difficulty: 'easy',   type: 'kc',   wom_metric: 'king_black_dragon',       baseTarget: 30,  scaling: 'sqrt' },
  { label: 'Kalphite Queen Kills',        category: 'pvm', difficulty: 'easy',   type: 'kc',   wom_metric: 'kalphite_queen',          baseTarget: 15,  scaling: 'sqrt' },
  { label: 'Scorpia Kills',              category: 'pvm', difficulty: 'easy',   type: 'kc',   wom_metric: 'scorpia',                 baseTarget: 40,  scaling: 'sqrt' },
  { label: 'Obor Kills',                 category: 'pvm', difficulty: 'easy',   type: 'kc',   wom_metric: 'obor',                    baseTarget: 15,  scaling: 'sqrt' },
  { label: 'Bryophyta Kills',            category: 'pvm', difficulty: 'easy',   type: 'kc',   wom_metric: 'bryophyta',               baseTarget: 15,  scaling: 'sqrt' },
  { label: 'Sarachnis Kills',            category: 'pvm', difficulty: 'easy',   type: 'kc',   wom_metric: 'sarachnis',               baseTarget: 25,  scaling: 'sqrt' },
  { label: 'Chaos Elemental Kills',      category: 'pvm', difficulty: 'easy',   type: 'kc',   wom_metric: 'chaos_elemental',         baseTarget: 20,  scaling: 'sqrt' },

  // ── PvM · Medium ───────────────────────────────────────────────────────────
  { label: 'Zulrah Kills',               category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'zulrah',                  baseTarget: 40,  scaling: 'sqrt' },
  { label: 'Vorkath Kills',              category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'vorkath',                 baseTarget: 35,  scaling: 'sqrt' },
  { label: 'Abyssal Sire Kills',         category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'abyssal_sire',            baseTarget: 30,  scaling: 'sqrt' },
  { label: 'Cerberus Kills',             category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'cerberus',                baseTarget: 40,  scaling: 'sqrt' },
  { label: 'Kraken Kills',               category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'kraken',                  baseTarget: 50,  scaling: 'sqrt' },
  { label: 'Grotesque Guardians Kills',  category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'grotesque_guardians',     baseTarget: 25,  scaling: 'sqrt' },
  { label: 'Smoke Devil Kills',          category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'thermonuclear_smoke_devil', baseTarget: 40, scaling: 'sqrt' },
  { label: 'Dagannoth Rex Kills',        category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'dagannoth_rex',           baseTarget: 50,  scaling: 'sqrt' },
  { label: 'Dagannoth Prime Kills',      category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'dagannoth_prime',         baseTarget: 50,  scaling: 'sqrt' },
  { label: 'Corporeal Beast Kills',      category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'corporeal_beast',         baseTarget: 10,  scaling: 'sqrt' },
  { label: 'Callisto Kills',             category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'callisto',                baseTarget: 20,  scaling: 'sqrt' },
  { label: 'Venenatis Kills',            category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'venenatis',               baseTarget: 20,  scaling: 'sqrt' },
  { label: 'Nightmare Kills',            category: 'pvm', difficulty: 'medium', type: 'kc',   wom_metric: 'nightmare',               baseTarget: 15,  scaling: 'sqrt' },

  // ── PvM · Hard ─────────────────────────────────────────────────────────────
  { label: 'General Graardor Kills',     category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'general_graardor',        baseTarget: 25,  scaling: 'sqrt' },
  { label: 'Commander Zilyana Kills',    category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'commander_zilyana',       baseTarget: 25,  scaling: 'sqrt' },
  { label: "Kree'arra Kills",            category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'kreearra',                baseTarget: 20,  scaling: 'sqrt' },
  { label: "K'ril Tsutsaroth Kills",     category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'kril_tsutsaroth',         baseTarget: 25,  scaling: 'sqrt' },
  { label: 'Nex Kills',                  category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'nex',                     baseTarget: 10,  scaling: 'sqrt' },
  { label: 'Chambers of Xeric CMs',     category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'chambers_of_xeric_challenge_mode', baseTarget: 8, scaling: 'sqrt' },
  { label: 'Theatre of Blood',           category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'theatre_of_blood',        baseTarget: 8,   scaling: 'sqrt' },
  { label: 'Tombs of Amascut',           category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'tombs_of_amascut',        baseTarget: 10,  scaling: 'sqrt' },
  { label: 'Alchemical Hydra Kills',     category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'alchemical_hydra',        baseTarget: 20,  scaling: 'sqrt' },
  { label: 'Phantom Muspah Kills',       category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'phantom_muspah',          baseTarget: 20,  scaling: 'sqrt' },
  { label: 'Duke Sucellus Kills',        category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'duke_sucellus',           baseTarget: 15,  scaling: 'sqrt' },
  { label: 'The Whisperer Kills',        category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'the_whisperer',           baseTarget: 15,  scaling: 'sqrt' },
  { label: 'Vardorvis Kills',            category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'vardorvis',               baseTarget: 15,  scaling: 'sqrt' },
  { label: 'The Leviathan Kills',        category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'the_leviathan',           baseTarget: 12,  scaling: 'sqrt' },
  { label: 'Araxxor Kills',              category: 'pvm', difficulty: 'hard',   type: 'kc',   wom_metric: 'araxxor',                 baseTarget: 10,  scaling: 'sqrt' },

  // ── Skilling · Easy ────────────────────────────────────────────────────────
  { label: 'Fishing XP',                 category: 'skilling', difficulty: 'easy',   type: 'xp', wom_metric: 'fishing',      baseTarget: 5_000_000, scaling: 'linear' },
  { label: 'Woodcutting XP',             category: 'skilling', difficulty: 'easy',   type: 'xp', wom_metric: 'woodcutting',  baseTarget: 5_000_000, scaling: 'linear' },
  { label: 'Cooking XP',                 category: 'skilling', difficulty: 'easy',   type: 'xp', wom_metric: 'cooking',      baseTarget: 5_000_000, scaling: 'linear' },
  { label: 'Firemaking XP',              category: 'skilling', difficulty: 'easy',   type: 'xp', wom_metric: 'firemaking',   baseTarget: 5_000_000, scaling: 'linear' },
  { label: 'Mining XP',                  category: 'skilling', difficulty: 'easy',   type: 'xp', wom_metric: 'mining',       baseTarget: 4_000_000, scaling: 'linear' },
  { label: 'Ranged XP',                  category: 'skilling', difficulty: 'easy',   type: 'xp', wom_metric: 'ranged',       baseTarget: 5_000_000, scaling: 'linear' },

  // ── Skilling · Medium ──────────────────────────────────────────────────────
  { label: 'Agility XP',                 category: 'skilling', difficulty: 'medium', type: 'xp', wom_metric: 'agility',      baseTarget: 3_000_000, scaling: 'linear' },
  { label: 'Thieving XP',                category: 'skilling', difficulty: 'medium', type: 'xp', wom_metric: 'thieving',     baseTarget: 4_000_000, scaling: 'linear' },
  { label: 'Herblore XP',                category: 'skilling', difficulty: 'medium', type: 'xp', wom_metric: 'herblore',     baseTarget: 2_000_000, scaling: 'linear' },
  { label: 'Crafting XP',                category: 'skilling', difficulty: 'medium', type: 'xp', wom_metric: 'crafting',     baseTarget: 3_000_000, scaling: 'linear' },
  { label: 'Fletching XP',               category: 'skilling', difficulty: 'medium', type: 'xp', wom_metric: 'fletching',    baseTarget: 5_000_000, scaling: 'linear' },
  { label: 'Smithing XP',                category: 'skilling', difficulty: 'medium', type: 'xp', wom_metric: 'smithing',     baseTarget: 2_000_000, scaling: 'linear' },
  { label: 'Slayer XP',                  category: 'skilling', difficulty: 'medium', type: 'xp', wom_metric: 'slayer',       baseTarget: 4_000_000, scaling: 'linear' },
  { label: 'Hunter XP',                  category: 'skilling', difficulty: 'medium', type: 'xp', wom_metric: 'hunter',       baseTarget: 3_000_000, scaling: 'linear' },

  // ── Skilling · Hard ────────────────────────────────────────────────────────
  { label: 'Runecraft XP',               category: 'skilling', difficulty: 'hard',   type: 'xp', wom_metric: 'runecrafting', baseTarget: 2_000_000, scaling: 'linear' },
  { label: 'Construction XP',            category: 'skilling', difficulty: 'hard',   type: 'xp', wom_metric: 'construction', baseTarget: 1_500_000, scaling: 'linear' },
  { label: 'Prayer XP',                  category: 'skilling', difficulty: 'hard',   type: 'xp', wom_metric: 'prayer',       baseTarget: 1_500_000, scaling: 'linear' },
  { label: 'Magic XP',                   category: 'skilling', difficulty: 'hard',   type: 'xp', wom_metric: 'magic',        baseTarget: 5_000_000, scaling: 'linear' },
  { label: 'Attack XP',                  category: 'skilling', difficulty: 'hard',   type: 'xp', wom_metric: 'attack',       baseTarget: 5_000_000, scaling: 'linear' },
  { label: 'Strength XP',                category: 'skilling', difficulty: 'hard',   type: 'xp', wom_metric: 'strength',     baseTarget: 5_000_000, scaling: 'linear' },

  // ── Collection · Easy ──────────────────────────────────────────────────────
  { label: 'Abyssal Whip',               category: 'collection', difficulty: 'easy',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Dragon Med Helm',            category: 'collection', difficulty: 'easy',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Berserker Ring',             category: 'collection', difficulty: 'easy',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Barrows Unique Piece',       category: 'collection', difficulty: 'easy',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Brimstone Ring Piece',       category: 'collection', difficulty: 'easy',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },

  // ── Collection · Medium ────────────────────────────────────────────────────
  { label: 'Tanzanite Fang',             category: 'collection', difficulty: 'medium', type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Magic Fang',                 category: 'collection', difficulty: 'medium', type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Dragon Warhammer',           category: 'collection', difficulty: 'medium', type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Avernic Defender Hilt',      category: 'collection', difficulty: 'medium', type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Occult Necklace',            category: 'collection', difficulty: 'medium', type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },

  // ── Collection · Hard ──────────────────────────────────────────────────────
  { label: 'Twisted Bow',                category: 'collection', difficulty: 'hard',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Scythe of Vitur',            category: 'collection', difficulty: 'hard',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: "Tumeken's Shadow",           category: 'collection', difficulty: 'hard',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Elysian Spirit Shield',      category: 'collection', difficulty: 'hard',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
  { label: 'Zaryte Vambraces',           category: 'collection', difficulty: 'hard',   type: 'drop', wom_metric: null, baseTarget: 1, scaling: 'fixed' },
];
