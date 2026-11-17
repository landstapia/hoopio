/* pages/rules.js - /rules : the FIBA RULES MANUAL for the scorer's table (menu: Others).
   A short, searchable summary of the rules the scorekeeper, timer and shot clock operator need, written from the
   FIBA Official Basketball Rules 2024 (valid from 1 October 2024). Every rule shows its article number, and the grey
   "In this app" boxes say how the scoresheet / controls handle it. It is a summary: the official rulebook always prevails.
   To change the text, edit the SECTIONS list below. */

const RULES_EDITION = 'FIBA Official Basketball Rules 2024 (valid from 1 October 2024)';
const RULES_URL = 'https://assets.fiba.basketball/image/upload/documents-corporate-fiba-official-rules-2024-v10.pdf';

const rlTable = (head, rows) => `<div class="rl-tw"><table class="rl-t"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td${i == 0 ? ' class="k"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const rlList = items => `<ul class="rl-l">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
const rlApp = html => `<div class="rl-app"><b>In this app</b>${html}</div>`;

const RULE_SECTIONS = [
  { id: 'time', title: 'Playing time and overtime', art: 'Articles 8 and 9', html: () =>
    rlTable(['What', 'Rule'], [
      ['Playing time', '4 quarters of 10 minutes.'],
      ['Before the game', 'An interval of 20 minutes before the scheduled start.'],
      ['Between quarters', '2 minutes between quarters 1 and 2, and between quarters 3 and 4. 15 minutes at half-time.'],
      ['Overtime', 'If the score is tied after the 4th quarter, play as many overtimes of <b>5 minutes</b> as needed. 2 minutes interval before each overtime.'],
      ['Start of the game', 'It cannot start unless both teams have <b>5 players</b> ready on the court.'],
      ['End of a period', 'It ends when the game clock signal sounds. A foul near the end: the referee decides the time left, and at least 0.1 second must show on the clock.'],
      ['Baskets', 'Teams change baskets for the second half. In every overtime they keep the baskets of the 4th quarter.'],
      ['Last 2:00 of the 4th quarter and of every overtime', 'Special rules apply: the clock stops after a made goal; the team that scored may not take a timeout or substitute then; after a timeout the coach may choose a frontcourt throw-in (Articles 17, 18, 19).'],
    ]) + rlApp('Period length is set in the game settings (default 10:00; overtime starts at 5:00). BREAK offers 1, 2, 15 minutes or a custom length. The period buzzer sounds automatically when the game clock reaches zero.') },

  { id: 'scoring', title: 'Scoring', art: 'Article 16', html: () =>
    rlTable(['Shot', 'Points'], [
      ['Free throw', '1 point'],
      ['Field goal from inside the 3-point line', '2 points'],
      ['Field goal from behind the 3-point line (arc radius 6.75 m)', '3 points'],
      ['A player scores in his own basket by accident', '2 points, credited to the captain of the opponents on the court'],
      ['A player scores in his own basket on purpose', 'A violation: the goal does not count'],
      ['Last free throw touches the ring and is then legally touched before it goes in', '2 points'],
    ]) + rlList(['The team with more points when playing time ends wins (Article 1.4).',
      'To gain control on a throw-in, or on a rebound after the last free throw, and then shoot, the game clock or the shot clock must show <b>0.3</b> second or more. At 0.2 or 0.1 only a tap or a direct dunk can score (Article 16.2.5).']) +
    rlApp('+1, +2 and +3 record the points for a player. The score on the Controls page (+1 +2 +3) is a correction with no player. A forfeit or default score (see the last sections) is entered as a manual score correction.') },

  { id: 'timeouts', title: 'Timeouts', art: 'Article 18', html: () =>
    rlTable(['What', 'Rule'], [
      ['Length', 'Each timeout lasts <b>1 minute</b>.'],
      ['First half', '2 timeouts per team, at any time.'],
      ['Second half', '3 timeouts per team, with at most <b>2</b> of them when the game clock shows 2:00 or less in the 4th quarter.'],
      ['Each overtime', '1 timeout per team.'],
      ['Unused timeouts', 'Are not carried over to the next half or overtime.'],
      ['Who asks', 'Only the head coach or the first assistant coach.'],
      ['When', 'During a timeout opportunity: the ball is dead and the clock stopped, or after the last free throw, or for the non-scoring team after a goal.'],
      ['Last 2:00 of Q4 and overtime', 'The team that has just scored may not take a timeout after a successful goal unless a referee has stopped the game. After a timeout, a team entitled to a backcourt throw-in may choose a frontcourt throw-in.'],
      ['Charged to', 'The team whose coach asked first, unless the timeout follows a goal by the opponents and no infraction happened.'],
    ]) + rlApp(`<p>Every team starts the first half with 2, the third quarter with 3 and each overtime with 1: the app sets them when the period changes.</p>
      <p>The length of a timeout is a league setting here: the default is <b>30 seconds</b> (FIBA: 1 minute). Change it in the game settings gear ("Default timeout length"). Tap TIMEOUT to start the default, hold it to pick another length.</p>
      <p>The "2 timeouts at most in the last 2:00" limit is not enforced by the app; the scorer or referee decides.</p>`) },

  { id: 'subs', title: 'Substitutions', art: 'Articles 4 and 19', html: () =>
    rlList([
      'Each team has up to <b>12</b> players entitled to play; 5 are on the court.',
      'A <b>substitution opportunity</b> starts when the ball is dead and the clock is stopped, after a successful last free throw, and (last 2:00 of Q4 and overtime) for the team that did <b>not</b> score after a goal.',
      'Only the substitute asks (at the scorer\'s table or on the substitution chair), never the coach.',
      'A player who came on, or went off, cannot go back until the ball has been dead after a period of running clock (some exceptions, for example a team with fewer than 5 players).',
      'A player with 5 fouls, or who is disqualified, must leave immediately (no more than 30 seconds).',
      'An injured player who cannot continue in about 15 seconds must be replaced (Article 5).',
    ]) + rlApp('SUBSTITUTES pauses the clocks (not in running time). Tap the player going off and the player coming on, then confirm. A player with 5 fouls cannot be put back on, and the app warns when a player gets his 5th foul.') },

  { id: 'shot', title: 'Shot clock', art: 'Article 29', html: () =>
    rlList(['A team must attempt a shot within <b>24 seconds</b> of gaining control of the ball. The ball must leave the hand before the signal and then touch the ring or go in.',
      'If the signal sounds while the ball is in the air: a goal counts; if the ball touches the ring play continues; if it misses the ring it is a violation (unless the opponents clearly gain control at once).']) +
    rlTable(['Situation', 'Shot clock'], [
      ['After the opening jump ball, or the centre-line throw-in that starts every other quarter and overtime, when a player gains control (29.2.1)', 'Starts with <b>24</b>'],
      ['The referee stops the game for a foul or violation by the defending team (not for the ball going out of bounds), or for a valid reason caused by the defending team, and the team in control gets the throw-in (29.2.2)', 'Backcourt throw-in: reset to <b>24</b>. Frontcourt throw-in: <b>14 or more</b> showing: not reset, it continues; <b>13 or less</b> showing: reset to <b>14</b>'],
      ['The game is stopped for a valid reason not connected with either team, or a reset would put the opponents at a disadvantage (29.2.2)', 'It <b>continues</b> from the time it was stopped'],
      ['The opponents get the throw-in after a foul or violation (also the ball going out of bounds) by the team that had control, or by the alternating possession arrow (29.2.3)', 'Backcourt throw-in: new <b>24</b>. Frontcourt throw-in: <b>14</b>'],
      ['The ball touches the ring and the <b>opponents</b> gain control (29.2.7)', 'Reset to <b>24</b>'],
      ['The ball touches the ring and the <b>same team</b> regains control (29.2.7)', 'Reset to <b>14</b>'],
      ['Frontcourt throw-in after an unsportsmanlike or disqualifying foul (29.2.6)', 'Reset to <b>14</b>'],
      ['Technical foul by the team in control (29.2.4)', 'Not reset, it <b>continues</b>'],
      ['Time-out in the last 2:00 of the 4th quarter or overtime (29.2.5)', 'The head coach may choose a frontcourt throw-in. After the ball went out of bounds: backcourt continues; frontcourt 13 or less continues, 14 or more is reset to 14. After a foul or violation, or a new team control: backcourt 24, frontcourt 14'],
      ['The shot clock signal sounds by mistake (29.2.8)', 'Disregarded and play continues. If the team in control was put at a disadvantage, the game is stopped, the clock corrected and the ball given to that team'],
    ]) + rlList(['The timer and the shot clock operator use two <b>separate, distinctly different, loud signals</b> (Article 3).']) +
    rlApp(`<p><b>+24</b> and <b>+14</b> set the shot clock to exactly 24 or 14, so the operator decides: with 20 seconds showing, +14 gives 14.</p>
      <p>Pausing the game clock pauses the shot clock; pausing the shot clock does not stop the game clock. A made basket resets the shot clock to 24.</p>
      <p>When the shot clock reaches zero a <b>higher, pulsing buzzer</b> sounds, clearly different from the game buzzer, and the game clock stops (it keeps running in a running-time game).</p>`) },

  { id: 'violations', title: 'Time violations', art: 'Articles 17, 26, 27, 28 and 43', html: () =>
    rlTable(['Violation', 'Rule'], [
      ['3 seconds', 'A player may not stay more than 3 consecutive seconds in the opponents\' restricted area while his team controls a live ball in the frontcourt and the clock runs.'],
      ['5 seconds, closely guarded', 'A player holding the ball with an opponent within 1 m must pass, shoot or dribble within 5 seconds.'],
      ['5 seconds, throw-in', 'The thrower-in must release the ball within 5 seconds.'],
      ['5 seconds, free throw', 'The shooter must release the ball within 5 seconds.'],
      ['8 seconds', 'A team must bring the ball into its frontcourt within 8 seconds of gaining control in the backcourt.'],
    ]) },

  { id: 'fouls', title: 'Fouls and penalties', art: 'Articles 34 to 41', html: () =>
    rlTable(['Foul', 'What it is', 'Penalty'], [
      ['Personal (Art. 34)', 'Illegal contact with an opponent.', 'Not shooting: throw-in, or 2 free throws if the team is in the penalty situation. Shooter: 2 or 3 free throws if the shot misses; if it goes in, the goal counts + 1 free throw. A throw-in foul in the last 2:00 of Q4 / overtime: 1 free throw.'],
      ['Technical (Art. 36)', 'Behaviour without contact (arguing, taunting, delaying the game, hanging on the ring ...).', '<b>1 free throw</b>, then the game resumes with the possession the team had. By a <b>player</b>: charged as a player foul and <b>counts as a team foul</b>. By the coach or bench: charged to the head coach, does <b>not</b> count as a team foul.'],
      ['Unsportsmanlike (Art. 37)', 'Contact that is not a legitimate play for the ball, excessive contact, stopping a fast break unnecessarily, ...', '<b>2 free throws</b> (shooter: goal + 1, or 2 / 3 free throws), then a throw-in at the frontcourt throw-in line opposite the scorer\'s table. Counts as a team foul.'],
      ['Disqualifying (Art. 38)', 'Any flagrant unsportsmanlike action.', '<b>2 free throws</b> (as above) and the offender leaves. Counts as a team foul when committed by a player (disqualifying fouls from a fight, Art. 39, do not count).'],
    ]) + `<h4 class="rl-h4">Limits</h4>` + rlTable(['Who', 'Limit'], [
      ['Player', '<b>5 fouls</b> (personal, technical, unsportsmanlike or disqualifying): he must leave and becomes an excluded player (Art. 40).'],
      ['Player, game disqualification', '<b>2 technical</b>, or <b>2 unsportsmanlike</b>, or <b>1 technical + 1 unsportsmanlike</b> foul (Art. 36.2.3, 37.2.3).'],
      ['Head coach, game disqualification', '2 technical fouls (\'C\') for his own behaviour, or 3 technical fouls (all \'B\' or one \'C\') including those of the bench (Art. 36.2.4).'],
      ['Disqualified person', 'Leaves immediately (no more than 30 seconds) and goes to the dressing room or leaves the building (Art. 40.6).'],
      ['A foul by an excluded player', 'Is charged to the head coach (\'B\').'],
    ]) + `<h4 class="rl-h4">Team fouls and the penalty situation (Art. 41)</h4>` + rlList([
      'A team foul is a personal, technical, unsportsmanlike or disqualifying foul committed by a <b>player</b>.',
      'A team is in the <b>penalty situation after 4 team fouls in a quarter</b>. From the next foul on (the 5th), a personal foul on a player who is <b>not</b> shooting gives <b>2 free throws</b> instead of a throw-in.',
      'Exception: a foul by a player of the team that controls the ball (or is entitled to it) is penalised by a throw-in for the opponents.',
      'Fouls committed during an interval count in the next quarter. <b>Fouls in overtime count as fouls of the 4th quarter.</b>',
    ]) + rlApp(`<p>Each player\'s fouls and the team fouls are counted per period; the scoresheet and scoreboard show them. The app warns on a player\'s 5th foul. The FOUL button on the Controls pages adds a team foul with no player.</p>
      <p><b>Technical fouls:</b> open FOUL on the scoresheet, pick the team at the bottom and tick "counts as a team foul" when a <b>player</b> committed it (leave it unticked for the coach or bench). The app counts technical fouls per team, not per player, so watch the 2-technical player disqualification yourself.</p>
      <p><b>BONUS:</b> the BONUS lamp and chip light when a team has <b>5</b> fouls in the period. By the rule above the team is already in the penalty situation after its <b>4th</b> foul, so the lamp shows one foul later than the official penalty situation.</p>`) },

  { id: 'arrow', title: 'Jump ball and possession arrow', art: 'Article 12', html: () =>
    rlList([
      'The first quarter starts with a jump ball in the centre circle.',
      'In every later jump-ball situation (held ball, doubt about who last touched the ball out of bounds, a ball stuck between the ring and the backboard, ...), the teams <b>alternate</b> possession with a throw-in.',
      'The team that does <b>not</b> gain control of the live ball after the opening jump ball gets the first alternating-possession throw-in.',
      'The arrow points towards the basket of the team that is entitled to the next throw-in, and is <b>reversed immediately</b> when that throw-in ends.',
      'The team entitled to the arrow at the end of a quarter starts the next quarter (and each overtime) with a throw-in from the centre line extended, opposite the scorer\'s table.',
      'A violation by the team during its alternating-possession throw-in loses that possession: the arrow is reversed.',
    ]) + rlApp('Use the Possession buttons (scoresheet, Game controls) or the BALL button on the Controls pages to set the arrow; tap the same button again to clear it. The scoreboard shows the arrow.') },

  { id: 'forfeit', title: 'Forfeit and default', art: 'Articles 20 and 21', html: () =>
    rlTable(['Case', 'When', 'Result'], [
      ['Game lost by <b>forfeit</b>', 'A team cannot field 5 players ready 15 minutes after the scheduled start, or its actions prevent the game, or it refuses to play when told by the crew chief.', 'The game is awarded to the opponents <b>20 to 0</b>; the forfeiting team gets 0 classification points. A second forfeit in a tournament disqualifies the team.'],
      ['Game lost by <b>default</b>', 'During the game a team has <b>fewer than 2 players</b> on the court ready to play.', 'If the other team is ahead the score stands; if not, the score is <b>2 to 0</b> in its favour. The defaulting team gets 1 classification point.'],
    ]) + rlApp('The app does not apply a forfeit or default by itself. Enter the result with the score corrections on the Controls page (or in the game\'s event log) and mark the game final.') },

  { id: 'equipment', title: 'Table equipment', art: 'Article 3', html: () =>
    rlList(['Game clock, scoreboard and shot clock.',
      'A stopwatch or other visible device (not the game clock) for timing timeouts.',
      '<b>Two separate, distinctly different and loud signals</b>: one for the shot clock operator and one for the timer.',
      'The scoresheet, player and head coach foul markers, team foul markers and the alternating possession arrow.']) +
    rlApp('The scoreboard and controls cover the clocks, the timeout countdown, the two different buzzers, the foul counters and the possession arrow.') },

  { id: 'app', title: 'Where this app differs from FIBA', art: 'League choices', html: () =>
    rlTable(['Topic', 'FIBA', 'This app'], [
      ['Clock', 'Stop time: the clock stops at every whistle.', 'Stop time by default. <b>Running time</b> is an optional league variation (not part of the FIBA rules): switch it on per game in the game settings. The clock still stops for timeouts, breaks and technical fouls, and FIBA stop-time is used again in the last 2:00 of Q4 and overtime (can be switched off).'],
      ['Timeout length', '1 minute.', 'Default 30 seconds, changeable in the game settings gear.'],
      ['Penalty situation', 'After 4 team fouls in a quarter.', 'The BONUS lamp lights at 5 team fouls.'],
      ['Team categories', 'Not in the rules.', 'Senior teams play Senior teams, Junior play Junior, Free play Free (league rule of this app).'],
      ['Shot clock +14', 'Reset to 14 only in the situations listed above.', 'The operator presses +14 or +24 and the clock is set exactly to that value.'],
      ['Standings', 'Classification points are defined by the competition.', 'Ranked by win %, then point difference, then points for (Games page).'],
    ]) },
];

pages.rules = function () {
  const toc = RULE_SECTIONS.map(s => `<a href="#rl-${s.id}" onclick="document.getElementById('rl-${s.id}').scrollIntoView({behavior:'smooth'});return false">${s.title}</a>`).join('');
  const body = RULE_SECTIONS.map(s => `<section class="rl-sec" id="rl-${s.id}"><div class="rl-hd"><h3>${s.title}</h3><span class="rl-art">${s.art}</span></div>${s.html()}</section>`).join('');
  return {
    bc: [['Rules manual']],
    h: `<style>
      .rl { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; align-items: start; }
      .rl > * { min-width: 0; }
      .rl-toc { position: sticky; top: 70px; display: flex; flex-direction: column; gap: 2px; padding: 10px; background: var(--card); border: 1px solid var(--bd); border-radius: 14px; }
      .rl-toc a { padding: 7px 10px; border-radius: 8px; color: var(--tx); font-size: 14px; } .rl-toc a:hover { background: #16224d; text-decoration: none; }
      .rl-sec { margin: 0 0 14px; padding: 12px 14px; background: var(--card); border: 1px solid var(--bd); border-radius: 14px; }
      .rl-hd { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 8px; } .rl-hd h3 { margin: 0; } .rl-art { font-size: 12px; font-weight: 700; letter-spacing: .06em; color: #b4c0ea; text-transform: uppercase; }
      .rl-tw { overflow-x: auto; } .rl-t { width: 100%; border-collapse: collapse; } .rl-t td { vertical-align: top; } .rl-t td.k { font-weight: 700; white-space: nowrap; padding-right: 16px; }
      .rl-l { margin: 8px 0; padding-left: 20px; } .rl-l li { margin: 4px 0; }
      .rl-h4 { margin: 14px 0 6px; font-size: 15px; }
      .rl-app { margin-top: 10px; padding: 8px 12px; border-left: 4px solid var(--ac); border-radius: 8px; background: #0f1a44; font-size: 14px; }
      .rl-app b:first-child { display: block; margin-bottom: 2px; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; color: #fbbf24; } .rl-app p { margin: 4px 0; }
      .rl-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 6px 0 12px; } .rl-bar input { flex: 1 1 280px; max-width: 460px; }
      .rl-note { font-size: 13px; color: #b4c0ea; } .rl-none { padding: 14px; color: #b4c0ea; }
      @media (max-width: 900px) { .rl { grid-template-columns: minmax(0, 1fr); } .rl-toc { position: static; flex-direction: row; flex-wrap: wrap; } }
      @media print { header, .bc, footer, .rl-toc, .rl-bar, .hmenu { display: none !important; } body { background: #fff; color: #000; } .rl { display: block; } .rl-sec { break-inside: avoid; background: #fff; color: #000; border-color: #999; } .rl-t th { background: #eee; color: #000; } .rl-app { background: #f3f3f3; color: #000; } }
    </style>
    ${pageHead('FIBA rules manual', [{ label: 'Print this manual', js: 'window.print()' }, { label: 'Open the official rulebook (PDF)', js: `window.open('${RULES_URL}','_blank')` }])}
    <p class="rl-note">A short guide for the scorer's table, based on the ${E(RULES_EDITION)}. The official rulebook always prevails. Grey boxes marked <b>In this app</b> say how the scoresheet and controls handle each rule.</p>
    <div class="rl-bar"><input id="rlq" type="search" placeholder="Search the rules…" title="For example: timeout, 14 seconds, technical foul" oninput="rulesFilter()" aria-label="Search the rules"><span id="rlc" class="rl-note"></span></div>
    <div class="rl"><nav class="rl-toc" aria-label="Sections">${toc}</nav><div id="rlbody">${body}<div id="rlnone" class="rl-none" style="display:none">No rule matches your search.</div></div></div>`,
  };
};

// Search: sections that do not contain every typed word are hidden
function rulesFilter() {
  const words = $('#rlq').val().toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  $('.rl-sec').each(function () {
    const text = $(this).text().toLowerCase(), ok = words.every(w => text.includes(w));
    $(this).toggle(ok);
    if (ok) shown++;
  });
  $('#rlnone').toggle(shown == 0);
  $('#rlc').text(words.length ? `${shown} of ${RULE_SECTIONS.length} sections` : '');
}
