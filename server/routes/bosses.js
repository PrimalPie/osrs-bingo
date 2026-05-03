const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { cacheAllBossIcons, cacheAllSkillIcons, getCachedBossIcon, getCachedSkillIcon } = require('../services/iconCache');

const router = express.Router();

// Same data as frontend osrs.js but without icon URLs (we resolve those here)
const BOSS_LIST = [
  { name: 'Chambers of Xeric',       keywords: ['cox','chambers','xeric','raids','olm'] },
  { name: 'Theatre of Blood',        keywords: ['tob','theatre','blood','verzik'] },
  { name: 'Tombs of Amascut',        keywords: ['toa','tombs','amascut','warden'] },
  { name: 'General Graardor',        keywords: ['graardor','bandos','bcp','gwd'] },
  { name: 'Commander Zilyana',       keywords: ['zilyana','sara','saradomin'] },
  { name: "Kree'arra",               keywords: ['kreearra','kree','armadyl','arma'] },
  { name: "K'ril Tsutsaroth",        keywords: ['kril','zammy','zamorak'] },
  { name: 'Nex',                     keywords: ['nex','zaryte','nihil'] },
  { name: 'Dagannoth Rex',           keywords: ['rex','dagannoth','dk','dks'] },
  { name: 'Dagannoth Prime',         keywords: ['prime','dagannoth','dk'] },
  { name: 'Dagannoth Supreme',       keywords: ['supreme','dagannoth','dk'] },
  { name: 'Callisto',                keywords: ['callisto','bear'] },
  { name: "Vet'ion",                 keywords: ['vetion',"vet'ion"] },
  { name: 'Venenatis',               keywords: ['venenatis','spider'] },
  { name: 'Scorpia',                 keywords: ['scorpia','scorpion'] },
  { name: 'Chaos Elemental',         keywords: ['chaos elemental','chaos ele'] },
  { name: "Calvar'ion",              keywords: ['calvarion',"calvar'ion"] },
  { name: 'Artio',                   keywords: ['artio'] },
  { name: 'Spindel',                 keywords: ['spindel'] },
  { name: 'Abyssal Sire',            keywords: ['sire','abyssal sire','unsired'] },
  { name: 'Cerberus',                keywords: ['cerberus','cerb','hellhound'] },
  { name: 'Kraken',                  keywords: ['kraken'] },
  { name: 'Thermonuclear Smoke Devil', keywords: ['smoke devil','thermy'] },
  { name: 'Grotesque Guardians',     keywords: ['grotesque','guardians','gg','dawn','dusk'] },
  { name: 'Alchemical Hydra',        keywords: ['hydra','alchemical'] },
  { name: 'Araxxor',                 keywords: ['araxxor','araxyte'] },
  { name: 'Vorkath',                 keywords: ['vorkath','vork'] },
  { name: 'Zulrah',                  keywords: ['zulrah','zul'] },
  { name: 'Corporeal Beast',         keywords: ['corp','corporeal','ely'] },
  { name: 'King Black Dragon',       keywords: ['kbd','king black dragon'] },
  { name: 'Kalphite Queen',          keywords: ['kq','kalphite queen'] },
  { name: 'Sarachnis',               keywords: ['sarachnis','cudgel'] },
  { name: 'Nightmare',               keywords: ['nightmare','phosani'] },
  { name: 'Giant Mole',              keywords: ['mole','giant mole'] },
  { name: 'Barrows',                 keywords: ['barrows','ahrim','dharok','guthan','karil','torag','verac'] },
  { name: 'Phantom Muspah',          keywords: ['phantom muspah','muspah'] },
  { name: 'Obor',                    keywords: ['obor','hill giant'] },
  { name: 'Bryophyta',               keywords: ['bryophyta','moss giant'] },
  { name: 'Duke Sucellus',           keywords: ['duke','sucellus'] },
  { name: 'The Leviathan',           keywords: ['leviathan'] },
  { name: 'The Whisperer',           keywords: ['whisperer'] },
  { name: 'Vardorvis',               keywords: ['vardorvis'] },
  { name: 'Wintertodt',              keywords: ['wintertodt','wt','bruma'] },
  { name: 'Tempoross',               keywords: ['tempoross','temp'] },
  { name: 'Zalcano',                 keywords: ['zalcano'] },
  { name: 'Guardians of the Rift',   keywords: ['guardians','rift','gotr'] },
  { name: 'Hueycoatl',               keywords: ['hueycoatl','hueya'] },
  { name: 'Amoxliatl',               keywords: ['amoxliatl'] },
];

const SKILL_LIST = [
  { name: 'Attack',       keywords: ['attack','atk'] },
  { name: 'Strength',     keywords: ['strength','str'] },
  { name: 'Defence',      keywords: ['defence','defense','def'] },
  { name: 'Ranged',       keywords: ['ranged','range','ranging'] },
  { name: 'Prayer',       keywords: ['prayer','pray'] },
  { name: 'Magic',        keywords: ['magic','mage'] },
  { name: 'Runecraft',    keywords: ['runecraft','runecrafting','rc'] },
  { name: 'Construction', keywords: ['construction','con'] },
  { name: 'Hitpoints',    keywords: ['hitpoints','hp'] },
  { name: 'Agility',      keywords: ['agility','agi'] },
  { name: 'Herblore',     keywords: ['herblore','herb'] },
  { name: 'Thieving',     keywords: ['thieving','thieve'] },
  { name: 'Crafting',     keywords: ['crafting','craft'] },
  { name: 'Fletching',    keywords: ['fletching','fletch'] },
  { name: 'Slayer',       keywords: ['slayer','slay'] },
  { name: 'Hunter',       keywords: ['hunter','hunt'] },
  { name: 'Mining',       keywords: ['mining','mine'] },
  { name: 'Smithing',     keywords: ['smithing','smith'] },
  { name: 'Fishing',      keywords: ['fishing','fish'] },
  { name: 'Cooking',      keywords: ['cooking','cook'] },
  { name: 'Firemaking',   keywords: ['firemaking','fm'] },
  { name: 'Woodcutting',  keywords: ['woodcutting','wc','woodcut'] },
  { name: 'Farming',      keywords: ['farming','farm'] },
];

let cacheInProgress = false;

// Returns boss/skill list with whatever local icons are already cached (non-blocking)
function buildList(list, getCached) {
  return list.map(entry => ({
    ...entry,
    icon: getCached(entry.name) || null,
  }));
}

// GET /api/bosses — returns list with cached icons, triggers download if not done yet
router.get('/bosses', (req, res) => {
  const bosses = buildList(BOSS_LIST, getCachedBossIcon);
  res.json(bosses);

  if (!cacheInProgress) {
    cacheInProgress = true;
    cacheAllBossIcons(BOSS_LIST)
      .then(() => { cacheInProgress = false; console.log('[Icons] Boss icon cache complete'); })
      .catch(e => { cacheInProgress = false; console.error('[Icons] Cache error:', e.message); });
  }
});

router.get('/skills', (req, res) => {
  const skills = buildList(SKILL_LIST, getCachedSkillIcon);
  res.json(skills);

  if (!cacheInProgress) {
    cacheInProgress = true;
    cacheAllSkillIcons(SKILL_LIST)
      .then(() => { cacheInProgress = false; })
      .catch(e => { cacheInProgress = false; });
  }
});

// POST /api/bosses/refresh — force re-cache all icons (admin only)
router.post('/bosses/refresh', requireAdmin, async (req, res) => {
  res.json({ ok: true, message: 'Icon refresh started' });
  cacheAllBossIcons(BOSS_LIST).catch(e => console.error('[Icons] Refresh error:', e.message));
});

module.exports = router;
