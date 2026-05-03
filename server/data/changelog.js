const CHANGELOG = [
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
