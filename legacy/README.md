# Basketball app

Run: `node server.js`, then open http://localhost:3000 (set another port with `PORT=8080 node server.js`).
No installation needed. Copy this whole folder to move the app to another device.

## Files
| File | What it is |
|---|---|
| `server.js` | Web server, game clock, saves `database.json`, writes `game-log.txt` |
| `database.json` / `game-log.txt` | Created on first run: your data / every game action |
| `public/index.html` | The one HTML page (lists which CSS and JS files are loaded) |
| `public/css/base.css` | Theme colors, layout, tables, buttons, forms |
| `public/css/scoreboard.css` | The big /scoreboard display |
| `public/css/playerboard.css` | The /playerboard display (rosters, fouls, points) |
| `public/css/scoresheet.css` | /scoresheet summary strip and button panels |
| `public/css/modal.css` | The "type a player number" popup |
| `public/js/brand.js` | League name, tagline and logo path (edit here to rebrand) |
| `public/img/` | `logo.png` (round BCBL logo) and `favicon.png` |
| `public/js/state.js` | Data, server calls, lookups, formatting |
| `public/js/stats.js` | Scores, fouls, player and team statistics |
| `public/js/ui.js` | HTML helpers (tables, images, default team icon) and the popup |
| `public/js/segment.js` | Draws the 7-segment digits (clock, shot clock, scores) |
| `public/js/buzzer.js` | Buzzer sound and the hold-to-sound button |
| `public/js/components.js` | Shared widgets: scoreboard, summary strip, roster |
| `public/js/actions.js` | What every button does |
| `public/js/ctl.js` | Operator panel shared by /controls and /custom-controls |
| `public/js/pages/custom.js` | Others: custom scoreboard + custom controls |
| `public/js/datatable.js` | Search / sort / column filters / paging for tables (Players, rankings, Games per season, box scores, scoresheet rosters) |
| `public/js/pages/*.js` | One file per page (dashboard, scoreboard, scoresheet, controls, games, teams, players, log) |
| `public/js/router.js` | Chooses the page from the address; starts the app |

## Where to change things
- Colors / theme: `css/base.css` (top, `:root`)
- Scoreboard look: `css/scoreboard.css` and `board()` in `js/components.js`
- Scoresheet buttons or layout: `js/pages/scoresheet.js` and `css/scoresheet.css`
- What a button does (clock rules, fouls, substitutions): `js/actions.js`
- Statistics maths: `js/stats.js`
- A new page: add `js/pages/yourpage.js` (`pages.yourpage = function(parts){ return {bc:[...], h:'...'} }`),
  add a `<script>` line in `index.html` and its name to `MENU` in `router.js`.

## Second-monitor scoreboard
Open `/scoreboard` on the second monitor, click once anywhere (browsers need one click before they allow sound), then press **F** (or double-click) for full screen.
The buzzer always sounds on that screen. Digit colors: `css/scoreboard.css` (`.pts`, `.clk`, `.shot`).

## Branding
The color theme is taken from the BCBL logo: navy `#01247c` and gold `#f2a501` (see `:root` in `css/base.css`).
To use another logo: replace `public/img/logo.png` (round with transparent corners looks best) and `public/img/favicon.png` (64x64), and edit the text in `js/brand.js`.

## Scoresheet groups
The scoresheet has three groups (tabs at the top show one group only, remembered per device). Cards sit side by side and stack on a narrow window:
**Statistics** (2 cards: Points & fouls | Other stats, then the rosters), **Timekeeper** (2 cards: Game clock | Possession) and
**Game** (3 cards: Breaks | Substitution | Timeouts, then the rosters).
The game clock card has **Adjust clocks…**: a window to change the game clock (±1s/10s/1:00, set mm:ss) and the shot clock (24, 14, ±1s, set, on/off).
The rosters at the bottom are sortable: click a column title (the sort stays while the page refreshes).

## Technical fouls
Press **FOUL**. The window lists the players (personal foul); at the bottom, **Technical foul**: tap the team that has it. No player is needed.
Tick "counts as a team foul" for a technical foul by a *player* (FIBA counts it as a team foul; coach / bench technicals are not). Technical fouls show in the summary
strip and in the game's event log. The game clock always stops for a technical foul.

## Running time (per game)
Tick **Running time** on the scoresheet (Timekeeper), on /controls, on the game's page, or when adding a game. It is saved with the game (`runningTime` in `database.json`).
Standard FIBA basketball is stop-time; running time is the usual league variation, built here on FIBA rules:
- The clock keeps running through **fouls and substitutions** (the buttons only write to the log). It still stops for **timeouts, breaks, technical fouls**; use Pause for an injury.
- A **shot clock violation** does not stop the game clock (the operator resets the shot clock).
- **FIBA stop-time in the last 2:00 of the 4th quarter and of every overtime**: fouls and substitutions stop the clock again, and a made 2 or 3 stops it. Untick
  "FIBA stop-time in the last 2:00…" to keep the clock running to the end (`rtLast2` in the database).
The summary strip shows a green RUNNING TIME badge (amber STOP TIME while the last 2:00 rule is in force).

## Player names
Player names always show at least 16 characters (scoresheet rosters, number picker, substitution and starting-player windows). The page uses the full window width.
At the start of a game and of every period the active players must be chosen (window cannot be closed until confirmed).
The buzzer sounds automatically at the end of each period, timeout and break.

## Left / right order
The scoreboard shows the teams in the order set by "Swap sides". The scoresheet and controls show the opposite order (the team on the right of the scoresheet is on the left of the scoreboard).
To show the same order everywhere set `MIRROR_OPERATOR_VIEW = false` in `public/js/state.js`.

## Database
`database.json` is upgraded automatically when the app starts (version 2). Before the first upgrade a copy is saved as `database.backup-v1.json`.
Archive hides a team/player but keeps all history. Deleting a player keeps old game events (shown as "Removed player").
Deleting a team removes its players and its games and asks you to type the team name first.


## Substitution and player pickers
- **Substitution** works like "select the starting players": one column per team with all its players. Green ✓ ON = on court, gray = bench.
  Tap an active player to take him off, tap a bench player to put him on (max 5). Nothing is saved until **Confirm substitution**; Cancel / ✕ discards.
- **+1 / +2 / +3 (and FOUL, REB, AST...)**: one column per team, active players first (by number). Tick **show bench players** to add a late entry
  (the bench follows the active players; the tick is remembered). Typing a jersey number filters both columns; Enter picks a single match.

## Timeouts
Each team has a **1:00** button and a **30s** button (both use up one timeout). Also on /controls and /custom-controls.

## Controls page (/controls) and Custom Controls (/custom-controls)
One layout for both, built for a landscape phone first and scaled to a laptop / full HD screen (no scrolling, no overflow). The slim top menu has a **Full screen**
button (on an iPhone, which has no web full screen, it hides the menu instead).
- **Summary column (left):** period, status, game clock, shot clock, both scores with game fouls and timeouts left, and the ball. During a break or timeout the
  countdown appears there.
- **Team cards (top):** `+1 +2 +3` (blue), **FOUL** (red, adds one team foul), **TIMEOUT** (yellow, asks for 1:00, 0:30 or a custom length) and **BALL** (dark blue, tap again
  to clear). Only the name and score use the team color. On /controls points typed here are a manual score correction and a team foul is an event without a player.
  The team **gear** adds or deducts points (-3 to +3), fouls and timeouts left.
- **CLOCK card:** big Start/Pause for the game clock and for the shot clock, `+24` and `+14`. Pausing the game clock pauses the shot clock automatically;
  pausing the shot clock does not pause the game clock. The **gear** sets the clocks, adds / deducts minutes and seconds, and hides / shows the shot clock.
- **GAME card:** Prev / Next period, BREAK (becomes END BREAK / END TIMEOUT while one runs), BUZZER (hold) and LONG BUZZER (one tap, 3 s).
  The **gear**: new game (on /controls it opens the Games page, on /custom-controls it resets the scoreboard), running time (live game only), team names and colors,
  period length, suspend / end a break, swap sides and "play the buzzer on this device".

## Others > Custom Scoreboard / Custom Controls
A manual scoreboard for when no game is being scored. Open **/custom-scoreboard** on the display and **/custom-controls** on the operator device.
Team names and colors, scores (+1 +2 +3 -1), period fouls, timeouts (1:00 / 30s), possession arrow, game clock, shot clock, period, breaks, buzzer and
swap sides all work by hand. It is stored in `db.custom` with its own clock, so it never changes the live game, players or statistics.

## New data fields (database version 3)
`players[].locale` (text), `teams[].category` (Senior / Junior / Free), `live.shotHold`, `db.custom`. On the first start the server upgrades the file
(a backup copy is made first). Team categories are guessed once from the team name ("Junior" / "Senior"), otherwise Free.

## Event log (game page /games/:id)
Compact and editable, **newest event first** (the oldest is at the bottom). One slim line per event: period, clock, team, player, type, running score and a delete button.
Period, clock, player and type are edited in the line itself and saved at once (timeouts, technical fouls, substitutions and team fouls only allow period, clock and delete).
Filters: team, type, period and player search. **+ Add event** opens one inline row (period, clock, team, player, type); it stays open so several events can be added.

## Look and feel (Material 3 touches, still compact)
- **Press feedback on every button** (`css/m3.css`, `js/feedback.js`): a state layer on hover / press, a ripple from the touch point, a slight press-in, and a visible keyboard focus ring.
  On the control pages a short vibration is added on phones that support it.
- **Dark dropdowns and pickers** everywhere (`color-scheme: dark`, dark option lists).
- **Hamburger menu** (top right) on team cards, the team page, the players list rows and the player page: Archive / Restore and Delete live there (`hmenu()` in `js/ui.js`).
- **Scoreboard:** the unlit "shadow" segments, timeout ticks, arrows and the BONUS lamp are much fainter, so the lit values read clearly.
- **Contrast:** text on every page and dialog was measured and fixed to at least 4.5:1 (3:1 for large text). A team color that is too dark to read is lightened on screen
  (`readable()` in `js/state.js`); the saved color is never changed. The unlit BONUS lamp is intentionally faint.

## Scoresheet (/scoresheet), regrouped
- **Top strip:** large scores, period fouls (turns to BONUS at 5), timeouts, game fouls / technicals, the big game clock and the shot clock.
- **SCORE CONTROLS:** `+1 +2 +3 FOUL` (large) and `REB AST STL BLK TO` (smaller). Gear: technical foul, team foul without a player, manual score correction, show bench players.
- **GAME CONTROLS:** Substitutes and Possession. Gear: choose starting players, team names and colors, previous / next period, swap sides, period length, new game.
- **TIMEKEEPING CONTROLS:** game clock and shot clock Pause/Start, `+24`, `+14`, TIMEOUT per team (1:00 / 0:30 / custom), BREAK / END BREAK, BUZZER (hold), LONG BUZZER.
  Gear: set or adjust the clocks, hide the shot clock, running time, break suspend / end, buzzer sound on this device.
- Both rosters stay at the bottom (sortable). The tabs All / Score / Game / Timekeeping show one group.
- **Event log (right side):** newest first, filter by team. The pencil opens a dialog to change period, clock, player and type (or delete); the bin asks for confirmation first.
  On windows narrower than 1200 px the log moves below the rosters.
- The buttons use the same controller as the Controls page (`CTL.main` in `js/ctl.js`), so both pages behave the same.

## One look on every user page
Buttons, fields, cards, tables and dialogs share one style (`css/base.css`, `css/m3.css`): tonal blue buttons with press feedback, 38 px dark fields, uppercase table headers with
striped rows, the same dialog shape, gear icons for settings and hamburger menus for item actions. The scoreboard displays are intentionally separate.

## Added features (latest update)
- **Foul type** — the FOUL window has a *Foul type* drop-down next to the number box: Personal (default), Technical or Flagrant. All three count in the player's PF and in the team fouls; technical and flagrant also stop the game clock (also in running time). The event log shows `FOUL (T)` / `FOUL (F)`, and technical fouls charged to players are included in the "Technical" count of the scoresheet strip. The team / bench technical foul area at the bottom of the window is unchanged.
- **Default game** — Games page: *Set default* (or *Remove default*) in the row, or *Mark as default game* on the game's page. Only one game is the default (shown with ★). Whenever no game is live (first start, or the live game was deleted) the default game becomes the live game (`useDefaultGame` in `server.js`). It does not replace a game that is already live.
- **Teams sort** — Teams page: *Sort by* Team name A–Z (default), Z–A, or order added. Remembered on this device (`localStorage.teamsSort`).
- **Haptic feedback** — `haptic()` in `js/feedback.js` is called by +24, +14 and the game clock / shot clock START / PAUSE buttons (Controls, Custom Controls and Scoresheet). Android uses `navigator.vibrate`; iPhone uses the hidden `<input type="checkbox" switch>` trick (iOS 17.4+, system haptics on). Devices without support do nothing.
- **Controls view** — /controls and /custom-controls: *All / Score / Clock / Game* buttons at the top of the left column show one group only (remembered per device, separately for each page). CSS: end of `css/controls.css`.
- **Shot clock buzzer** — now a steady tone like the game buzzer but a little higher (294 Hz instead of 233 Hz). Change the numbers in `js/buzzer.js` (`const tones = shot ? ...`) to adjust the pitch.

## Added features (foul options, coaches, printable scoresheet)
- **FOUL window, bottom part** — *Foul type* (Personal default / Technical / Flagrant), the tick *counts as a team foul* (ticked by default; a foul without the tick still counts for the player but not for the team fouls), and one button per team for the **Coach** and the **Assistant coach**. A coach foul has the same options but no player / jersey number; it is shown in the event log as `Coach: <name>` with `(T)` / `(F)`, and technical fouls are included in the technical count. The old "team / bench technical foul" area of this window is replaced by these buttons (the bench technical is still available in the scoresheet's gear menu).
- **Teams** — new fields *Head coach* and *First assistant coach* (Teams page, add form and the team's page).
- **Games** — every game now has a game number that follows the date and time (earliest game = No. 1; same date and time: the one added first). Numbers are renumbered automatically when a game is added, deleted, or its date or time changes, a *competition* (default BCBL) and a *place* (default Rodriguez Village Basketball Court). Set them when adding a game; the competition and place can be edited on the game's page.
- **Print scoresheet** — tick *print scoresheet* when adding a game, or use *Scoresheet* in the games list / *Print scoresheet* on the game's page (`/games/:id/scoresheet`). It fills the FIBA sheet (`public/img/fiba-scoresheet.jpg`) with Team A (home) and Team B (away), competition, date, time, game no., place, the players (Last name, First name and number, up to 12 per team, by number), head coach and first assistant coach. Print on Folio 8.5 × 13 in, margins none, scale 100%. Positions of the text are in `gameScoresheet()` at the end of `js/pages/games.js`.

## Added features (captain and official roster)
- **Captain** — Teams page, team's page: *Captain* drop-down (active players of the team) next to the coaches; press Save. A captain who is archived or moved to another team is no longer treated as captain. On the printed FIBA scoresheet the captain's name is followed by `(CAP)`.
- **Official roster** — team's page, gear menu → *Generate Official Roster* (`teamRoster()` in `js/export.js`). A printable A4 sheet (Print / Save as PDF) with photo, last name, first name, nickname, jersey number and locale of every active player, the captain first (marked CAPTAIN), the coaches, a certification line and a signature line for the captain with the printed name and the date signed. Players without a photo show their initials.

## Added features (full team name, print all rosters)
- **Full team name** — the full name of the team is shown in small letters under its abbreviation in the scoresheet's top strip and in the controls (team cards and the left summary). In custom controls it shows the *Full name* typed in the gear.
- **Print all team rosters** — Teams page, gear menu: one printable document with the official roster of every active team that has players (name order), each team starting on a new page (`allTeamsRosters()` in `js/export.js`).

## Scoreboard menu: Score and Player
The **Scoreboard** item in the top menu is now a drop-down (`SCOREBOARD_MENU` in `js/router.js`):
- **Score** → `/scoreboard`, the big scoreboard (unchanged).
- **Player** → `/playerboard` (`js/pages/playerboard.js`, `css/playerboard.css`): both rosters of the live game on one 1600×900 stage that scales to any screen.
  Each team shows its abbreviation (or the custom name set on the scoreboard), full name and logo (team photo, or the abbreviation if none). Each player row has the
  jersey number, name, five foul dots (green = fouls so far, the 5th turns red = fouled out) and points. Teams are in the same left/right order as `/scoreboard` (Swap sides applies).
  Rows: active (non-archived) players, plus anyone who played in the game; sorted by number. Up to 15 rows per team at full size, more rows shrink automatically.
  Like `/scoreboard` it hides the menu; **F** or double-click = full screen. It updates live with the game.

## Player identity verification and Players page filters
- **Identity verified** — on a player's page (`/players/:id`) tick *Identity verified*. It is saved at once and the **server** writes the date and time of the tick
  (`verified` + `verifiedAt` in `players[]` of `database.json`, see `stampVerified()` in `server.js`). The time stays while the box is ticked; unticking asks for confirmation and clears it.
  The tick and the time are also written to `game-log.txt`, and a ✔ verified mark shows next to the name. Old databases need no upgrade (no tick = not verified).
- **Players page** — a small picture (or the initials if there is none) and a *Verified* column (Yes + date/time, or No) were added. Two drop-downs above the table filter
  **Picture** (All / With picture / No picture) and **Identity** (All / Verified / Not verified); the column filter boxes also work (type `no picture`, or `yes` / `no` under Verified).
  *Generate CSV* has two new columns: *Identity verified* and *Verified on*.
- **Remove picture** — a red *Remove picture* button next to Save on a player's page (shown only when the player has a picture) clears it after a confirmation; the initials are shown again.
- **Games page** — the *Match* column of the schedule now shows the full team names (`Team A vs Team B`) instead of the abbreviations.

## Team page statistics, large players table, always-visible field labels
- **Team page (`/teams/:id`)** — `teamStatsHtml()` in `js/pages/teams.js` (look: `css/teamstats.css`): a big **record** (W–L), win %, current streak, games; scoring (points per game, allowed per game, point difference);
  **records** highlighted with a ★ (highest score, biggest win, fewest points allowed, longest win streak); season totals with per-game averages; and team leaders (points, rebounds, assists, steals).
  The players table is ~135% larger, has a picture left of the name, the name as `Last, First “Nickname”` (like the Players page) and a **Locale** column (`rtab(..., big = true)` in `js/ui.js`).
- **Fields with an always-visible label** — `fi()` (text/number), `fs()` (drop-down) and `fx()` (date, time, color, file) in `js/ui.js`, styled by `css/fields.css`. The label rests inside the empty box and moves onto the
  border (smaller) when there is text or focus. Used on the team, player and game forms, the filters, the events toolbar, the edit-event popup and the table search / rows boxes.
  The live-game operator console (`/controls`, popups in `js/actions.js`) keeps its compact controls. Use the same helpers for any new field.
