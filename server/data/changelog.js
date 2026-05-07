const CHANGELOG = [
  {
    date: '2026-05-07',
    entries: [
      { type: 'improvement', description: 'Events now auto-activate and auto-complete based on their start and end dates. The server checks every 60 seconds — no admin action needed for events to go live or close on schedule. Both transitions are logged in the audit log under the system actor.' },
      { type: 'feature', description: 'Previous event results on the board page — when no event is active, the most recently completed event is shown below the countdown. Click "View Board" to see the final standings, a winner banner, and the full board with the winning team pre-selected. Any team can be clicked to see their final progress.' },
      { type: 'feature', description: 'Drag-and-drop tile reordering — drag any tile onto another to swap their positions. Available in the Board Generator preview (before applying) and in Admin > Tiles (for setup events). The generator shows a "Rearranged" badge and a Reset Order button; the admin grid shows an "Unsaved layout changes" bar with Save Layout and Reset buttons.' },
      { type: 'improvement', description: 'Tile editing and reordering are disabled in Admin > Tiles while an event is active. A warning banner explains why and prompts you to end the event first.' },
    ],
  },
  {
    date: '2026-05-06',
    entries: [
      { type: 'feature', description: 'Points game mode — events can now be set to Blackout (first to complete every tile) or Points (5 pts per tile, 50 pt bonus for completing a full row, column, or diagonal). Mode is chosen when creating an event and can be changed at any time via Edit.' },
      { type: 'feature', description: 'Live scoreboard on the board page — teams are ranked by score (points mode) or tiles completed (blackout mode) with a crown for the current leader. Standings update in real time as submissions are approved.' },
      { type: 'feature', description: 'Rules helper text below the scoreboard explains the active game mode at a glance.' },
      { type: 'feature', description: 'Board generator now auto-assigns icons — boss tiles use locally cached hiscores icons, skill tiles use the skill icon cache, and drop tiles use their RuneLite item IDs. Icons are written to the database on apply, so no manual icon selection is needed after generating a board.' },
      { type: 'feature', description: 'Untradable item search — the tile icon picker now includes a curated list of untradable items (combat capes, void set, graceful, skilling outfits, Theatre of Blood and Chambers of Xeric ornament kits, HMT uniques such as Sanguine Dust, and boss pets). These appear before GE results and use RuneLite item cache icons.' },
      { type: 'fix', description: 'Board grid cells now have a consistent fixed height using CSS Grid (replacing the previous HTML table layout). Tiles with longer labels no longer expand their row, keeping the board visually uniform.' },
    ],
  },
  {
    date: '2026-05-05',
    entries: [
      { type: 'feature', description: 'Board Generator — admin-only sandbox at /generate. Choose total players, number of teams, board size (5×5 or 7×7), duration, and difficulty/category mix. Targets scale automatically by team size and event length (linear for XP, square-root for KC, fixed for rare drops). Preview the colour-coded grid before applying it to any event.' },
      { type: 'improvement', description: 'Event start and end dates now include a time component. Admins enter the time in UTC; the board countdown counts down to the exact start time rather than midnight.' },
      { type: 'improvement', description: 'Board countdown displays the event start time converted to each viewer\'s local timezone, labelled with their GMT offset (e.g. "Local Time (GMT+1)").' },
      { type: 'fix', description: 'Edit Event modal is now wider with start and end date/time pickers stacked vertically, preventing the inputs from being cramped.' },
      { type: 'feature', description: 'Events now have configurable start and end dates (UTC). Set them when creating or edit them later — useful for pre-creating events before dates are confirmed.' },
      { type: 'feature', description: 'Countdown timer on the board page — when no event is active, the page shows the next upcoming event name and a live countdown to its start date (UTC).' },
      { type: 'feature', description: 'Edit button on each event row in the admin panel — change the name, WOM competition ID, and start/end dates at any time without recreating the event.' },
      { type: 'improvement', description: 'Only one event can be active at a time — activating an event now returns an error if another is already active, preventing accidental double-activation.' },
      { type: 'feature', description: 'Event-level WOM competition ID now acts as the master competition for all WOM-tracked tiles. Set the metric on a tile (e.g. zulrah, fletching) and it pulls gains for that metric from the event competition using the ?metric= preview parameter — no separate competition per tile needed. Per-tile competition IDs still work as overrides.' },
      { type: 'improvement', description: 'KC tiles can now set a WOM metric name (boss name, e.g. zulrah) to enable auto-tracking via the event competition, matching how XP tiles work.' },
    ],
  },
  {
    date: '2026-05-04',
    entries: [
      { type: 'improvement', description: 'WOM sync interval increased from 3 minutes to 3 hours to respect WiseOldMan API best practices. A manual Sync Now button on the Events tab allows an immediate update at any time.' },
      { type: 'improvement', description: 'Login rate limiting — accounts are locked out after 10 failed attempts in a 15-minute window to prevent brute-force attacks.' },
      { type: 'improvement', description: 'Password minimum length of 8 characters enforced on account creation and password resets.' },
      { type: 'improvement', description: 'Username validation — only letters, numbers, underscores, and hyphens accepted (max 32 characters).' },
      { type: 'improvement', description: 'Role values validated on account create and update — only admin, captain, and member are accepted.' },
      { type: 'fix', description: 'Screenshot file extension whitelist in the Discord bot — only jpg, jpeg, png, gif, and webp are accepted, falling back to png for unrecognised extensions.' },
      { type: 'fix', description: 'Captains can no longer approve, reject, or view submissions belonging to other teams.' },
      { type: 'fix', description: 'Submission history now reads the captain\'s team from the database rather than the JWT, preventing stale data after a team reassignment.' },
    ],
  },
  {
    date: '2026-05-03',
    entries: [
      { type: 'feature', description: 'Per-tile WOM competition IDs — XP and KC tiles can each reference their own WOM competition for auto-tracking, replacing the single per-event ID.' },
      { type: 'feature', description: 'KC tiles now support WOM auto-tracking. Set a competition ID on any KC tile and Discord submissions are no longer needed for it.' },
      { type: 'feature', description: 'Audit log in admin panel — tracks submission approvals/rejections, user management actions, event status changes, and team roster changes.' },
      { type: 'feature', description: 'Changelog page (this page) — publicly visible record of all features and fixes.' },
      { type: 'fix', description: 'WOM API endpoint updated from deprecated /participants sub-route to the current /competitions/:id response structure.' },
      { type: 'fix', description: '/auth/me now reads fresh user data from the database on every request, so role or team changes made by an admin take effect immediately without requiring a re-login.' },
      { type: 'fix', description: 'Captain team scope enforced on the server — captains can only add or remove members from their own team, not any team.' },
      { type: 'improvement', description: '/teams/mine reads team assignment from the database rather than the JWT, preventing stale data after an admin reassigns a captain.' },
    ],
  },
  {
    date: '2026-04-22',
    entries: [
      { type: 'feature', description: 'Bingo event management with configurable board sizes from 3×3 up to 12×12.' },
      { type: 'feature', description: 'Three tile types: Drop (manual screenshot submission), Kill Count (manual or WOM auto-tracked), and XP (WOM auto-tracked).' },
      { type: 'feature', description: 'Discord bot for submission intake. Members post in their team channel using the format `A1 - Item Name` with a screenshot attached.' },
      { type: 'feature', description: 'Captain dashboard with Pending, History, By Tile, and My Team tabs for managing submissions and team rosters.' },
      { type: 'feature', description: 'Submission approve/reject flow with Discord reactions (✅/❌) and automatic reply messages sent back to the submission channel.' },
      { type: 'feature', description: 'Screenshot lightbox — click any submission image to view it full screen.' },
      { type: 'feature', description: 'Live board view with team selector. Selecting a team overlays their progress on every tile.' },
      { type: 'feature', description: 'Boss and skill icons loaded from the Jagex CDN and cached locally, used throughout the tile editor and board.' },
      { type: 'feature', description: 'WOM XP tile auto-tracking — polled every 3 minutes, progress updates pushed live to the board via WebSocket.' },
      { type: 'feature', description: 'Admin panel covering events, tiles, teams, users, and board viewer for historical events.' },
      { type: 'feature', description: 'Event reactivation — completed events can be reopened from the admin panel.' },
      { type: 'feature', description: 'User accounts with admin and captain roles. Admins create accounts and assign captains to teams.' },
      { type: 'feature', description: 'Docker deployment with a persistent data volume for the database, uploads, and icon cache.' },
      { type: 'fix', description: 'Discord bot invalid-format reply only fires when a message starts with a coordinate pattern, avoiding noise in general team channel chat.' },
    ],
  },
];

module.exports = CHANGELOG;
