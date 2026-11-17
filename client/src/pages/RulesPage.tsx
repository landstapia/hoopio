import { useState } from 'react';
import { BookOpen } from 'lucide-react';

const RULE_SECTIONS = [
  {
    title: '1. Game Clock & Periods (FIBA Art. 8)',
    items: [
      'Four (4) periods of 10 minutes each, with 2-minute intervals between Q1–Q2, Q3–Q4, and before each overtime period.',
      'Half-time interval between Q2 and Q3 is 15 minutes.',
      'If the score is tied at the end of Q4, as many 5-minute overtime periods as necessary are played to break the tie.',
      'Running-time league option: clock runs through fouls and substitutions, reverting to FIBA stop-time in the final 2:00 of Q4 and any overtime period (stopping after made field goals as well).',
    ],
  },
  {
    title: '2. Shot Clock (FIBA Art. 29)',
    items: [
      'A team gaining control of a live ball on the court must attempt a field goal within 24 seconds.',
      'Offensive rebound after a field goal or last free throw that touches the ring resets the shot clock to 14 seconds.',
      'A defensive foul or kick/fist violation in the frontcourt with less than 14 seconds remaining resets the shot clock to 14 seconds; with 14 or more seconds remaining, the shot clock continues from where it stopped.',
      'Shot clock is turned OFF whenever the game clock displays less than the shot clock value (e.g., under 24.0s or 14.0s).',
    ],
  },
  {
    title: '3. Team Fouls & Penalty / Bonus (FIBA Art. 41)',
    items: [
      'A team is in the team foul penalty situation after committing four (4) team fouls in a period.',
      'Starting on the 5th team foul in that period, all subsequent non-shooting player personal fouls are penalized with two (2) free throws.',
      'Team fouls accumulated in Q4 carry over into all overtime periods.',
      'Technical fouls committed by a player count toward both personal fouls (5-foul disqualification) and team fouls; bench/coach technical fouls count only toward staff disqualification.',
    ],
  },
  {
    title: '4. Charged Time-Outs (FIBA Art. 18)',
    items: [
      'Each team is granted 2 time-outs during the first half (Q1–Q2), 3 time-outs during the second half (Q3–Q4), and 1 time-out per overtime period.',
      'Unused time-outs do not carry over to the next half or overtime.',
      'Maximum of 2 time-outs per team may be used in the last 2 minutes of the 4th period.',
      'Each FIBA time-out lasts 60 seconds (configurable to 30 seconds in league play).',
    ],
  },
  {
    title: '5. Alternating Possession & Substitutions (FIBA Art. 12 & 19)',
    items: [
      'The team that does not gain control of the live ball on the opening jump ball is entitled to the first alternating possession arrow.',
      'Substitutions are permitted whenever the game clock is stopped and the ball is dead, or for the non-scoring team after a made basket in the final 2:00 of Q4 and overtime.',
    ],
  },
];

export function RulesPage() {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();

  const filtered = RULE_SECTIONS.map((sec) => ({
    ...sec,
    items: q
      ? sec.items.filter((item) => item.toLowerCase().includes(q) || sec.title.toLowerCase().includes(q))
      : sec.items,
  })).filter((sec) => sec.items.length > 0);

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-[#f2a501]" />
          <div>
            <h1 className="text-xl font-extrabold text-white">FIBA Table Officials Reference</h1>
            <p className="text-xs text-[#8c9bc4]">Quick timing, foul penalty, and shot-clock rules</p>
          </div>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rules (e.g. 14, bonus, timeout)…"
          className="h-9 w-64 rounded-xl border border-[#3a4a8f] bg-[#0f1a44] px-3 text-xs text-white placeholder-[#94a5d4]"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((sec) => (
          <section key={sec.title} className="rounded-2xl border border-[#1a2d6b] bg-[#0a1530] p-4">
            <h2 className="mb-2 text-base font-extrabold text-[#f2a501]">{sec.title}</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-[#eef2fb]">
              {sec.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}