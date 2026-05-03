const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const ICONS_ROOT = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'icons')
  : path.join(__dirname, '..', 'icons');
const BOSSES_DIR = path.join(ICONS_ROOT, 'bosses');
const SKILLS_DIR = path.join(ICONS_ROOT, 'skills');
if (!require('fs').existsSync(BOSSES_DIR)) require('fs').mkdirSync(BOSSES_DIR, { recursive: true });
if (!require('fs').existsSync(SKILLS_DIR)) require('fs').mkdirSync(SKILLS_DIR, { recursive: true });
const RS_BASE = 'https://www.runescape.com/img/rsp777';
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (compatible; osrs-bingo-app/1.0)' };

// Exact filenames from the official OSRS hiscores page
const BOSS_ICONS = {
  'Chambers of Xeric':        'game_icon_chambersofxeric.png',
  'Theatre of Blood':         'game_icon_theatreofblood.png',
  'Tombs of Amascut':         'game_icon_tombsofamascut.png',
  'General Graardor':         'game_icon_generalgraardor.png',
  'Commander Zilyana':        'game_icon_commanderzilyana.png',
  "Kree'arra":                'game_icon_kreearra.png',
  "K'ril Tsutsaroth":         'game_icon_kriltsutsaroth.png',
  'Nex':                      'game_icon_nex.png',
  'Dagannoth Rex':            'game_icon_dagannothrex.png',
  'Dagannoth Prime':          'game_icon_dagannothprime.png',
  'Dagannoth Supreme':        'game_icon_dagannothsupreme.png',
  'Callisto':                 'game_icon_callisto.png',
  "Vet'ion":                  'game_icon_vetion.png',
  'Venenatis':                'game_icon_venenatis.png',
  'Scorpia':                  'game_icon_scorpia.png',
  'Chaos Elemental':          'game_icon_chaoselemental.png',
  "Calvar'ion":               'game_icon_calvarion.png',
  'Artio':                    'game_icon_artio.png',
  'Spindel':                  'game_icon_spindel.png',
  'Abyssal Sire':             'game_icon_abyssalsire.png',
  'Cerberus':                 'game_icon_cerberus.png',
  'Kraken':                   'game_icon_kraken.png',
  'Thermonuclear Smoke Devil':'game_icon_thermonuclearsmokedevil.png',
  'Grotesque Guardians':      'game_icon_grotesqueguardians.png',
  'Alchemical Hydra':         'game_icon_alchemicalhydra.png',
  'Araxxor':                  'game_icon_araxxor.png',
  'Vorkath':                  'game_icon_vorkath.png',
  'Zulrah':                   'game_icon_zulrah.png',
  'Corporeal Beast':          'game_icon_corporealbeast.png',
  'King Black Dragon':        'game_icon_kingblackdragon.png',
  'Kalphite Queen':           'game_icon_kalphitequeen.png',
  'Sarachnis':                'game_icon_sarachnis.png',
  'Nightmare':                'game_icon_nightmare.png',
  'Giant Mole':               'game_icon_giantmole.png',
  'Barrows':                  'game_icon_barrowschests.png',
  'Phantom Muspah':           'game_icon_phantommuspah.png',
  'Obor':                     'game_icon_obor.png',
  'Bryophyta':                'game_icon_bryophyta.png',
  'Duke Sucellus':            'game_icon_dukesucellus.png',
  'The Leviathan':            'game_icon_theleviathan.png',
  'The Whisperer':            'game_icon_thewhisperer.png',
  'Vardorvis':                'game_icon_vardorvis.png',
  'Wintertodt':               'game_icon_wintertodt.png',
  'Tempoross':                'game_icon_tempoross.png',
  'Zalcano':                  'game_icon_zalcano.png',
  'Guardians of the Rift':    'game_icon_riftsclosed.png',
  'Hueycoatl':                'game_icon_thehueycoatl.png',
  'Amoxliatl':                'game_icon_amoxliatl.png',
};

const SKILL_ICONS = {
  'Attack':       'hiscores/skill_icon_attack1.gif',
  'Strength':     'hiscores/skill_icon_strength1.gif',
  'Defence':      'hiscores/skill_icon_defence1.gif',
  'Ranged':       'hiscores/skill_icon_ranged1.gif',
  'Prayer':       'hiscores/skill_icon_prayer1.gif',
  'Magic':        'hiscores/skill_icon_magic1.gif',
  'Runecraft':    'hiscores/skill_icon_runecraft1.gif',
  'Construction': 'hiscores/skill_icon_construction1.gif',
  'Hitpoints':    'hiscores/skill_icon_hitpoints1.gif',
  'Agility':      'hiscores/skill_icon_agility1.gif',
  'Herblore':     'hiscores/skill_icon_herblore1.gif',
  'Thieving':     'hiscores/skill_icon_thieving1.gif',
  'Crafting':     'hiscores/skill_icon_crafting1.gif',
  'Fletching':    'hiscores/skill_icon_fletching1.gif',
  'Slayer':       'hiscores/skill_icon_slayer1.gif',
  'Hunter':       'hiscores/skill_icon_hunter1.gif',
  'Mining':       'hiscores/skill_icon_mining1.gif',
  'Smithing':     'hiscores/skill_icon_smithing1.gif',
  'Fishing':      'hiscores/skill_icon_fishing1.gif',
  'Cooking':      'hiscores/skill_icon_cooking1.gif',
  'Firemaking':   'hiscores/skill_icon_firemaking1.gif',
  'Woodcutting':  'hiscores/skill_icon_woodcutting1.gif',
  'Farming':      'hiscores/skill_icon_farming1.gif',
};

async function downloadTo(url, dest) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = await res.buffer();
  fs.writeFileSync(dest, buf);
}

function safeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_') + '.png';
}

async function cacheAllBossIcons(bossList) {
  const results = {};
  for (const boss of bossList) {
    const filename = safeFilename(boss.name);
    const localPath = path.join(BOSSES_DIR, filename);
    const localUrl = `/icons/bosses/${filename}`;

    if (fs.existsSync(localPath)) { results[boss.name] = localUrl; continue; }

    const iconFile = BOSS_ICONS[boss.name];
    if (!iconFile) { console.warn(`[Icons] No hiscores icon mapped for: ${boss.name}`); results[boss.name] = null; continue; }

    try {
      await downloadTo(`${RS_BASE}/${iconFile}`, localPath);
      console.log(`[Icons] Cached: ${boss.name}`);
      results[boss.name] = localUrl;
    } catch (e) {
      console.warn(`[Icons] Failed ${boss.name}: ${e.message}`);
      results[boss.name] = null;
    }
  }
  return results;
}

async function cacheAllSkillIcons(skillList) {
  const results = {};
  for (const skill of skillList) {
    const filename = safeFilename(skill.name);
    const localPath = path.join(SKILLS_DIR, filename);
    const localUrl = `/icons/skills/${filename}`;

    if (fs.existsSync(localPath)) { results[skill.name] = localUrl; continue; }

    const iconFile = SKILL_ICONS[skill.name];
    if (!iconFile) { results[skill.name] = null; continue; }

    try {
      await downloadTo(`${RS_BASE}/${iconFile}`, localPath);
      console.log(`[Icons] Cached skill: ${skill.name}`);
      results[skill.name] = localUrl;
    } catch (e) {
      console.warn(`[Icons] Failed skill ${skill.name}: ${e.message}`);
      results[skill.name] = null;
    }
  }
  return results;
}

function getCachedBossIcon(bossName) {
  const localPath = path.join(BOSSES_DIR, safeFilename(bossName));
  return fs.existsSync(localPath) ? `/icons/bosses/${safeFilename(bossName)}` : null;
}

function getCachedSkillIcon(skillName) {
  const localPath = path.join(SKILLS_DIR, safeFilename(skillName));
  return fs.existsSync(localPath) ? `/icons/skills/${safeFilename(skillName)}` : null;
}

module.exports = { cacheAllBossIcons, cacheAllSkillIcons, getCachedBossIcon, getCachedSkillIcon };
