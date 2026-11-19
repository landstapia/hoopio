import { useState, type ReactNode } from 'react';
import type { FibaDiagramId } from '../../data/fibaRules2026';

type SignalCategory =
  | 'all'
  | 'clock'
  | 'scoring'
  | 'subs-timeouts'
  | 'informative'
  | 'violations'
  | 'numbers'
  | 'fouls'
  | 'special-fouls'
  | 'penalties';

interface RefereeSignalItem {
  code: string;
  category: Exclude<SignalCategory, 'all'>;
  categoryLabel: string;
  title: string;
  gesture: string;
  svg: ReactNode;
}

function RefBody({
  headY = 40,
  children,
}: {
  headY?: number;
  children: ReactNode;
}) {
  return (
    <svg viewBox="0 0 120 120" className="mx-auto h-24 w-24">
      <circle cx="60" cy={headY} r="9.5" fill="#c7d2fe" />
      <rect
        x="46"
        y={headY + 13}
        width="28"
        height="36"
        rx="6"
        fill="#2a3f87"
        stroke="#8c9bc4"
        strokeWidth="1.5"
      />
      {children}
    </svg>
  );
}

const ALL_FIBA_SIGNALS: RefereeSignalItem[] = [
  // --- 1. GAME CLOCK SIGNALS ---
  {
    code: 'CLK-1',
    category: 'clock',
    categoryLabel: 'Game Clock',
    title: 'Stop the Clock',
    gesture: 'One arm raised straight overhead with open palm facing forward.',
    svg: (
      <RefBody headY={46}>
        <path d="M 46 62 L 38 40 L 38 18" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <rect x="33" y="10" width="10" height="9" rx="2" fill="#f2a501" />
        <path d="M 74 62 L 80 82" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'CLK-2',
    category: 'clock',
    categoryLabel: 'Game Clock',
    title: 'Stop the Clock for Foul',
    gesture: 'One arm raised straight overhead with clenched fist.',
    svg: (
      <RefBody headY={46}>
        <path d="M 46 62 L 38 40 L 38 20" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="38" cy="16" r="6" fill="#ef4444" />
        <path d="M 74 62 L 80 82" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'CLK-3',
    category: 'clock',
    categoryLabel: 'Game Clock',
    title: 'Start the Clock',
    gesture: 'Chop downward with one hand from shoulder height.',
    svg: (
      <RefBody headY={40}>
        <path d="M 46 56 L 34 44 L 28 32" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 28 36 L 28 60" fill="none" stroke="#f2a501" strokeWidth="3" strokeDasharray="3 3" />
        <polygon points="28,65 23,57 33,57" fill="#f2a501" />
        <path d="M 74 56 L 80 78" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },

  // --- 2. SCORING SIGNALS ---
  {
    code: '1 PT',
    category: 'scoring',
    categoryLabel: 'Scoring',
    title: '1 Point',
    gesture: '1 index finger extended; flag hand down from the wrist.',
    svg: (
      <RefBody headY={44}>
        <path d="M 46 60 L 34 42 L 34 26" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="34" y1="24" x2="34" y2="12" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
        <path d="M 39 16 A 10 10 0 0 1 44 26" fill="none" stroke="#f2a501" strokeWidth="2" />
        <path d="M 74 60 L 80 80" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: '2 PTS',
    category: 'scoring',
    categoryLabel: 'Scoring',
    title: '2 Points',
    gesture: '2 fingers extended; flag hand down from the wrist.',
    svg: (
      <RefBody headY={44}>
        <path d="M 46 60 L 34 42 L 34 26" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="31" y1="24" x2="29" y2="12" stroke="#f2a501" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="37" y1="24" x2="39" y2="12" stroke="#f2a501" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 74 60 L 80 80" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: '3 ATT',
    category: 'scoring',
    categoryLabel: 'Scoring',
    title: '3 Points Attempt',
    gesture: '3 fingers extended on one arm raised overhead.',
    svg: (
      <RefBody headY={44}>
        <path d="M 46 60 L 34 42 L 34 26" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="29" y1="24" x2="26" y2="12" stroke="#f2a501" strokeWidth="3" strokeLinecap="round" />
        <line x1="34" y1="24" x2="34" y2="11" stroke="#f2a501" strokeWidth="3" strokeLinecap="round" />
        <line x1="39" y1="24" x2="42" y2="12" stroke="#f2a501" strokeWidth="3" strokeLinecap="round" />
        <path d="M 74 60 L 80 80" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: '3 PTS',
    category: 'scoring',
    categoryLabel: 'Scoring',
    title: '3 Points Successful',
    gesture: 'Both arms raised overhead with 3 fingers extended on each hand.',
    svg: (
      <RefBody headY={46}>
        <path d="M 46 62 L 36 42 L 36 26" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 62 L 84 42 L 84 26" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="32" y1="24" x2="30" y2="13" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="36" y1="24" x2="36" y2="12" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="40" y1="24" x2="42" y2="13" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="80" y1="24" x2="78" y2="13" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="84" y1="24" x2="84" y2="12" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="88" y1="24" x2="90" y2="13" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
      </RefBody>
    ),
  },

  // --- 3. SUBSTITUTION & TIME-OUT SIGNALS ---
  {
    code: 'SUB',
    category: 'subs-timeouts',
    categoryLabel: 'Subs & Time-outs',
    title: 'Substitution',
    gesture: 'Cross forearms in front of chest with open hands.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 54 L 38 66 L 72 56" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 74 54 L 82 66 L 48 56" fill="none" stroke="#f2a501" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </RefBody>
    ),
  },
  {
    code: 'BECK',
    category: 'subs-timeouts',
    categoryLabel: 'Subs & Time-outs',
    title: 'Beckoning-in (Substitute)',
    gesture: 'Open palm waved toward the body from shoulder height.',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 54 L 30 44 L 36 30" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 38 28 Q 48 26 52 36" fill="none" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
        <polygon points="54,39 47,36 53,32" fill="#f2a501" />
        <path d="M 74 54 L 80 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'T/O',
    category: 'subs-timeouts',
    categoryLabel: 'Subs & Time-outs',
    title: 'Charged Time-out (60s)',
    gesture: 'Form a "T" with index finger touching the open palm of the other hand.',
    svg: (
      <RefBody headY={44}>
        {/* Horizontal open palm overhead */}
        <path d="M 46 60 L 38 38 L 48 22" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="46" y1="20" x2="74" y2="20" stroke="#f2a501" strokeWidth="4.5" strokeLinecap="round" />
        {/* Vertical index finger touching palm */}
        <path d="M 74 60 L 76 40 L 60 36" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="60" y1="36" x2="60" y2="22" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'MEDIA',
    category: 'subs-timeouts',
    categoryLabel: 'Subs & Time-outs',
    title: 'Media Time-out',
    gesture: 'Open arms horizontally with clenched fists.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 54 L 18 54" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 54 L 102 54" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="15" cy="54" r="5.5" fill="#f2a501" />
        <circle cx="105" cy="54" r="5.5" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'CNT',
    category: 'subs-timeouts',
    categoryLabel: 'Subs & Time-outs',
    title: 'Visible Count (5s / 8s)',
    gesture: 'Counting movement with palm while moving hand side to side.',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 54 L 30 62 L 22 46" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 14 42 Q 24 34 34 42" fill="none" stroke="#f2a501" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M 74 54 L 80 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },

  // --- 4. INFORMATIVE SIGNALS ---
  {
    code: 'CNCL',
    category: 'informative',
    categoryLabel: 'Informative',
    title: 'Cancel Score / Cancel Play',
    gesture: 'Scissor-like action once across the chest with both arms.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 54 L 22 62" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 54 L 98 62" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 30 68 L 90 68" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeDasharray="4 3" />
      </RefBody>
    ),
  },
  {
    code: 'COMM',
    category: 'informative',
    categoryLabel: 'Informative',
    title: 'Communication (Thumb Up)',
    gesture: 'Thumb up raised to signal readiness or communication with table.',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 56 L 34 50 L 34 38" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="34" y1="36" x2="34" y2="27" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
        <path d="M 74 56 L 80 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'RST',
    category: 'informative',
    categoryLabel: 'Informative',
    title: 'Shot Clock Reset',
    gesture: 'Rotate hand with index finger extended overhead.',
    svg: (
      <RefBody headY={46}>
        <path d="M 46 62 L 38 40 L 38 22" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="38" cy="14" rx="11" ry="4" fill="none" stroke="#f2a501" strokeWidth="2.5" />
        <path d="M 74 62 L 80 82" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'DIR',
    category: 'informative',
    categoryLabel: 'Informative',
    title: 'Direction of Play / Out-of-Bounds',
    gesture: 'Point in direction of play with arm parallel to sidelines.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 54 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 54 L 102 54" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <polygon points="110,54 100,49 100,59" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'HELD',
    category: 'informative',
    categoryLabel: 'Informative',
    title: 'Held Ball / Jump Ball Situation',
    gesture: 'Both thumbs raised vertically, then point in alternating possession arrow direction.',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 56 L 38 52 L 38 42" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 82 52 L 82 42" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="38" y1="40" x2="38" y2="32" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
        <line x1="82" y1="40" x2="82" y2="32" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'HCC',
    category: 'informative',
    categoryLabel: 'Informative',
    title: 'Head Coach’s Challenge (2026)',
    gesture: 'Rotate hand with index finger extended, followed by IRS rectangle signal.',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 54 L 36 42 L 48 34" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 54 L 84 42 L 72 34" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <rect x="47" y="24" width="26" height="16" rx="2" fill="none" stroke="#f2a501" strokeWidth="2.5" />
      </RefBody>
    ),
  },
  {
    code: 'IRS',
    category: 'informative',
    categoryLabel: 'Informative',
    title: 'Instant Replay System Review',
    gesture: 'Draw a rectangle in the air with index fingers.',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 56 L 38 46 L 46 38" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 82 46 L 74 38" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <rect x="46" y="26" width="28" height="18" rx="2" fill="none" stroke="#38bdf8" strokeWidth="2.5" />
      </RefBody>
    ),
  },

  // --- 5. VIOLATION SIGNALS ---
  {
    code: 'TRV',
    category: 'violations',
    categoryLabel: 'Violations',
    title: 'Travelling',
    gesture: 'Rotate clenched fists around each other in front of chest.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 66 L 52 66" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 82 66 L 68 66" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="53" cy="64" r="5" fill="#f2a501" />
        <circle cx="67" cy="70" r="5" fill="#f2a501" />
        <path d="M 48 56 A 14 14 0 0 1 72 56" fill="none" stroke="#f2a501" strokeWidth="2" />
      </RefBody>
    ),
  },
  {
    code: 'DBL',
    category: 'violations',
    categoryLabel: 'Violations',
    title: 'Illegal Dribble (Double Dribble)',
    gesture: 'Patting motion with both open palms facing down.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 34 66 L 44 68" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 86 66 L 76 68" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="36" y1="68" x2="48" y2="68" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
        <line x1="72" y1="74" x2="84" y2="74" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'CRY',
    category: 'violations',
    categoryLabel: 'Violations',
    title: 'Carrying the Ball',
    gesture: 'Half rotation forward with open palm from palm-up to palm-down.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 88 64 L 98 64" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 92 56 A 10 10 0 0 1 92 72" fill="none" stroke="#f2a501" strokeWidth="2.5" />
      </RefBody>
    ),
  },
  {
    code: '3s',
    category: 'violations',
    categoryLabel: 'Violations',
    title: '3 Seconds Violation',
    gesture: 'Arm extended forward showing 3 fingers.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 94 56" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="96" y1="52" x2="106" y2="49" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="96" y1="56" x2="107" y2="56" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
        <line x1="96" y1="60" x2="106" y2="63" stroke="#f2a501" strokeWidth="2.8" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: '5s',
    category: 'violations',
    categoryLabel: 'Violations',
    title: '5 Seconds Violation',
    gesture: 'Show 5 spread fingers on raised hand.',
    svg: (
      <RefBody headY={42}>
        <path d="M 46 58 L 34 42 L 34 28" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="34" cy="22" r="7" fill="#f2a501" />
        <text x="34" y="25" textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold">
          5
        </text>
        <path d="M 74 58 L 80 78" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: '8s',
    category: 'violations',
    categoryLabel: 'Violations',
    title: '8 Seconds Violation',
    gesture: 'Show 8 fingers (5 on one hand, 3 on the other).',
    svg: (
      <RefBody headY={42}>
        <path d="M 46 58 L 34 42 L 34 28" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 58 L 86 42 L 86 28" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="34" cy="22" r="7" fill="#f2a501" />
        <text x="34" y="25" textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold">
          5
        </text>
        <circle cx="86" cy="22" r="7" fill="#f2a501" />
        <text x="86" y="25" textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold">
          3
        </text>
      </RefBody>
    ),
  },
  {
    code: '24s',
    category: 'violations',
    categoryLabel: 'Violations',
    title: '24 Seconds Violation',
    gesture: 'Fingers touch the top of the shoulder.',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 54 L 88 46 L 74 48" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="74" cy="48" r="5" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'BCK',
    category: 'violations',
    categoryLabel: 'Violations',
    title: 'Ball Returned to Backcourt',
    gesture: 'Wave arm with index finger extended in front of body.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 84 68 L 54 68" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 46 64 L 78 64" fill="none" stroke="#f2a501" strokeWidth="2.5" strokeDasharray="3 3" />
      </RefBody>
    ),
  },
  {
    code: 'FOOT',
    category: 'violations',
    categoryLabel: 'Violations',
    title: 'Deliberate Foot Ball',
    gesture: 'Point index finger toward the foot.',
    svg: (
      <RefBody headY={32}>
        <line x1="53" y1="81" x2="53" y2="104" stroke="#8c9bc4" strokeWidth="5" strokeLinecap="round" />
        <line x1="67" y1="81" x2="67" y2="104" stroke="#8c9bc4" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 52 L 84 74 L 72 98" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="69" cy="102" r="4.5" fill="#f2a501" />
      </RefBody>
    ),
  },

  // --- 6. NUMBER OF PLAYERS ---
  {
    code: '00 / 0',
    category: 'numbers',
    categoryLabel: 'Player Numbers',
    title: 'Numbers 00 and 0',
    gesture: 'Both hands show "0" (00) or right hand shows "0" (0).',
    svg: (
      <RefBody headY={40}>
        <path d="M 46 56 L 36 44 L 36 32" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 84 44 L 84 32" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="36" cy="24" r="6" fill="none" stroke="#f2a501" strokeWidth="3" />
        <circle cx="84" cy="24" r="6" fill="none" stroke="#f2a501" strokeWidth="3" />
      </RefBody>
    ),
  },
  {
    code: '1 – 5',
    category: 'numbers',
    categoryLabel: 'Player Numbers',
    title: 'Numbers 1 to 5',
    gesture: 'Right hand shows 1 to 5 fingers.',
    svg: (
      <RefBody headY={40}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 84 42 L 84 30" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <rect x="75" y="14" width="18" height="14" rx="3" fill="#f2a501" />
        <text x="84" y="24" textAnchor="middle" fill="#000" fontSize="9.5" fontWeight="bold">
          1–5
        </text>
      </RefBody>
    ),
  },
  {
    code: '6 – 10',
    category: 'numbers',
    categoryLabel: 'Player Numbers',
    title: 'Numbers 6 to 10',
    gesture: 'Right hand shows 5; left hand shows 1 to 5.',
    svg: (
      <RefBody headY={40}>
        <path d="M 46 56 L 36 42 L 36 30" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 84 42 L 84 30" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <rect x="27" y="14" width="18" height="14" rx="3" fill="#f2a501" />
        <text x="36" y="24" textAnchor="middle" fill="#000" fontSize="9.5" fontWeight="bold">
          1–5
        </text>
        <rect x="75" y="14" width="18" height="14" rx="3" fill="#f2a501" />
        <text x="84" y="24" textAnchor="middle" fill="#000" fontSize="9.5" fontWeight="bold">
          5
        </text>
      </RefBody>
    ),
  },
  {
    code: '11 – 15',
    category: 'numbers',
    categoryLabel: 'Player Numbers',
    title: 'Numbers 11 to 15',
    gesture: 'Right hand shows clenched fist (10); left hand shows 1 to 5.',
    svg: (
      <RefBody headY={40}>
        <path d="M 46 56 L 36 42 L 36 30" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 84 42 L 84 30" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <rect x="27" y="14" width="18" height="14" rx="3" fill="#f2a501" />
        <text x="36" y="24" textAnchor="middle" fill="#000" fontSize="9.5" fontWeight="bold">
          1–5
        </text>
        <circle cx="84" cy="22" r="6.5" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: '16 – 99',
    category: 'numbers',
    categoryLabel: 'Player Numbers',
    title: 'Two-Digit Numbers (16–99)',
    gesture: 'First show tens digit with reverse hand(s), then show units digit.',
    svg: (
      <RefBody headY={40}>
        <path d="M 46 56 L 36 42 L 36 30" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 84 42 L 84 30" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <rect x="24" y="14" width="24" height="14" rx="3" fill="#38bdf8" />
        <text x="36" y="24" textAnchor="middle" fill="#000" fontSize="8.5" fontWeight="bold">
          10s
        </text>
        <rect x="72" y="14" width="24" height="14" rx="3" fill="#f2a501" />
        <text x="84" y="24" textAnchor="middle" fill="#000" fontSize="8.5" fontWeight="bold">
          1s
        </text>
      </RefBody>
    ),
  },

  // --- 7. TYPE OF FOULS ---
  {
    code: 'P',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Personal Foul (General)',
    gesture: 'Clenched fist raised overhead; other hand points to waist.',
    svg: (
      <RefBody headY={44}>
        <path d="M 46 60 L 32 42 L 32 22" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="32" cy="18" r="6" fill="#f2a501" />
        <path d="M 74 60 L 86 74 L 74 82" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'HLD',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Holding',
    gesture: 'Grasp wrist downward in front of waist.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 54 L 44 74 L 54 92" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 54 L 74 74 L 52 84" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="52" cy="84" r="5.5" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'BLK',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Blocking / Illegal Screen',
    gesture: 'Both hands placed firmly on hips.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 54 L 30 66 L 46 78" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 54 L 90 66 L 74 78" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="46" cy="78" r="4.5" fill="#f2a501" />
        <circle cx="74" cy="78" r="4.5" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'PSH',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Pushing / Charging Without Ball',
    gesture: 'Imitate a forward push with both open palms.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 36 66 L 46 70" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 56 L 84 66 L 74 70" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="46" y1="63" x2="46" y2="77" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
        <line x1="74" y1="63" x2="74" y2="77" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'HND',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Handchecking',
    gesture: 'Grab palm and forward motion with open hand.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 36 68 L 54 68" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 84 68 L 62 68" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="58" cy="68" r="5.5" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'IUH',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Illegal Use of Hands',
    gesture: 'Strike wrist with edge of other hand.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 74 L 68 74" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 54 L 76 62 L 60 72" fill="none" stroke="#f2a501" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'CHG',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Charging With Ball',
    gesture: 'Clenched fist strikes open palm of other hand.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 36 72 L 54 72" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="54" y1="62" x2="54" y2="82" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
        <path d="M 74 56 L 82 72 L 62 72" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="61" cy="72" r="5.5" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'ICH',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Illegal Contact to Hand',
    gesture: 'Strike palm towards the other forearm.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 40 74 L 52 62" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 56 L 80 72 L 56 66" fill="none" stroke="#f2a501" strokeWidth="4.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'HOK',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Hooking',
    gesture: 'Move lower arm backward in a hooking motion.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 88 64 L 82 48" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 92 60 A 12 12 0 0 0 80 44" fill="none" stroke="#f2a501" strokeWidth="2.5" />
      </RefBody>
    ),
  },
  {
    code: 'ELB',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Excessive Swinging of Elbow',
    gesture: 'Swing elbow backward.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 54 L 94 58 L 82 68" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="94" cy="58" r="5" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'HEAD',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Hit to the Head',
    gesture: 'Imitate contact to the head with open hand.',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 54 L 86 42 L 72 36" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="71" cy="36" r="4.5" fill="#ef4444" />
      </RefBody>
    ),
  },
  {
    code: 'OFF',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Foul by Team in Control of Ball',
    gesture: 'Point clenched fist toward basket of offending team.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 54 L 100 54" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="104" cy="54" r="6" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'AOS',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Foul on the Act of Shooting',
    gesture: 'One arm with clenched fist, followed by indication of number of free throws.',
    svg: (
      <RefBody headY={42}>
        <path d="M 46 58 L 34 42 L 34 26" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="34" cy="22" r="5.5" fill="#f2a501" />
        <path d="M 74 58 L 88 58" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="90" y1="55" x2="100" y2="53" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
        <line x1="90" y1="60" x2="100" y2="62" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'NAOS',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Foul Not on the Act of Shooting',
    gesture: 'One arm with clenched fist, followed by pointing to the floor.',
    svg: (
      <RefBody headY={42}>
        <path d="M 46 58 L 34 42 L 34 26" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="34" cy="22" r="5.5" fill="#f2a501" />
        <path d="M 74 58 L 88 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <polygon points="93,82 84,78 90,72" fill="#38bdf8" />
      </RefBody>
    ),
  },
  {
    code: 'FLOP',
    category: 'fouls',
    categoryLabel: 'Type of Fouls',
    title: 'Fake a Foul (Flop)',
    gesture: 'Raise lower arm twice from waist upward.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 84 72 L 94 58" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 88 74 A 14 14 0 0 0 96 62" fill="none" stroke="#f2a501" strokeWidth="2.5" />
      </RefBody>
    ),
  },

  // --- 8. SPECIAL FOULS (INCLUDING 2026 DI & FL) ---
  {
    code: 'DF',
    category: 'special-fouls',
    categoryLabel: 'Special Fouls',
    title: 'Double Foul',
    gesture: 'Wave clenched fists on both hands overhead.',
    svg: (
      <RefBody headY={46}>
        <path d="M 46 62 L 36 42 L 36 22" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 62 L 84 42 L 84 22" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="36" cy="18" r="5.5" fill="#f2a501" />
        <circle cx="84" cy="18" r="5.5" fill="#f2a501" />
        <path d="M 28 12 L 44 12 M 76 12 L 92 12" stroke="#f2a501" strokeWidth="2" />
      </RefBody>
    ),
  },
  {
    code: 'T',
    category: 'special-fouls',
    categoryLabel: 'Special Fouls',
    title: 'Technical Foul (Cat. 1 & 2)',
    gesture: 'Form a "T" in front of chest showing both open palms.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 54 L 34 64 L 60 64" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 54 L 86 76 L 60 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <line x1="46" y1="62" x2="74" y2="62" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
        <line x1="60" y1="62" x2="60" y2="82" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: 'DI',
    category: 'special-fouls',
    categoryLabel: 'Special Fouls',
    title: 'Disruptive Foul (New 2026)',
    gesture: 'Grasp raised wrist upward with the other hand.',
    svg: (
      <RefBody headY={44}>
        <path d="M 46 60 L 42 38 L 42 18" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="42" cy="14" r="5" fill="#ffffff" />
        <path d="M 74 60 L 66 36 L 42 30" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="42" cy="30" r="6" fill="#f2a501" />
      </RefBody>
    ),
  },
  {
    code: 'FL',
    category: 'special-fouls',
    categoryLabel: 'Special Fouls',
    title: 'Flagrant Foul (New 2026)',
    gesture: 'Cross both wrists overhead with clenched fists.',
    svg: (
      <RefBody headY={46}>
        <path d="M 46 62 L 38 40 L 70 18" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 62 L 82 40 L 50 18" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="70" cy="18" r="5" fill="#ef4444" />
        <circle cx="50" cy="18" r="5" fill="#ef4444" />
      </RefBody>
    ),
  },
  {
    code: 'D',
    category: 'special-fouls',
    categoryLabel: 'Special Fouls',
    title: 'Disqualifying Foul',
    gesture: 'Both arms raised straight overhead with clenched fists.',
    svg: (
      <RefBody headY={46}>
        <path d="M 46 62 L 38 40 L 38 20" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <path d="M 74 62 L 82 40 L 82 20" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="38" cy="16" r="5.5" fill="#ef4444" />
        <circle cx="82" cy="16" r="5.5" fill="#ef4444" />
      </RefBody>
    ),
  },
  {
    code: 'C / B',
    category: 'special-fouls',
    categoryLabel: 'Special Fouls',
    title: 'Coach / Bench Technical',
    gesture: 'Technical "T" signal directed toward head coach (C) or bench area (B).',
    svg: (
      <RefBody headY={36}>
        <line x1="46" y1="62" x2="74" y2="62" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
        <line x1="60" y1="62" x2="60" y2="82" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
        <rect x="82" y="54" width="24" height="16" rx="3" fill="#16224d" stroke="#f2a501" strokeWidth="1.5" />
        <text x="94" y="65" textAnchor="middle" fill="#f2a501" fontSize="9" fontWeight="bold">
          C/B
        </text>
      </RefBody>
    ),
  },

  // --- 9. FOUL PENALTY ADMINISTRATION & FREE THROWS ---
  {
    code: 'PEN-0',
    category: 'penalties',
    categoryLabel: 'Penalties & FTs',
    title: 'After Foul Without Free Throw(s)',
    gesture: 'Point in direction of play with arm parallel to sidelines.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 54 L 102 54" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <polygon points="110,54 100,49 100,59" fill="#38bdf8" />
      </RefBody>
    ),
  },
  {
    code: 'PEN-O',
    category: 'penalties',
    categoryLabel: 'Penalties & FTs',
    title: 'After Foul by Team in Control',
    gesture: 'Clenched fist in direction of play with arm parallel to sidelines.',
    svg: (
      <RefBody headY={36}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 54 L 100 54" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="104" cy="54" r="6" fill="#38bdf8" />
      </RefBody>
    ),
  },
  {
    code: '1 FT',
    category: 'penalties',
    categoryLabel: 'Penalties & FTs',
    title: '1 Free Throw',
    gesture: 'Hold up 1 finger (at waist level / directed to scorer’s table).',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 88 56 L 88 46" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="88" y1="44" x2="88" y2="33" stroke="#f2a501" strokeWidth="4" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: '2 FTs',
    category: 'penalties',
    categoryLabel: 'Penalties & FTs',
    title: '2 Free Throws',
    gesture: 'Hold up 2 fingers (at waist level / directed to scorer’s table).',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 88 56 L 88 46" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="85" y1="44" x2="83" y2="33" stroke="#f2a501" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="91" y1="44" x2="93" y2="33" stroke="#f2a501" strokeWidth="3.5" strokeLinecap="round" />
      </RefBody>
    ),
  },
  {
    code: '3 FTs',
    category: 'penalties',
    categoryLabel: 'Penalties & FTs',
    title: '3 Free Throws',
    gesture: 'Hold up 3 fingers (at waist level / directed to scorer’s table).',
    svg: (
      <RefBody headY={38}>
        <path d="M 46 56 L 38 76" fill="none" stroke="#ffffff" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M 74 56 L 88 56 L 88 46" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" />
        <line x1="83" y1="44" x2="80" y2="34" stroke="#f2a501" strokeWidth="3" strokeLinecap="round" />
        <line x1="88" y1="44" x2="88" y2="32" stroke="#f2a501" strokeWidth="3" strokeLinecap="round" />
        <line x1="93" y1="44" x2="96" y2="34" stroke="#f2a501" strokeWidth="3" strokeLinecap="round" />
      </RefBody>
    ),
  },
];

const SIGNAL_TABS: Array<{ id: SignalCategory; label: string }> = [
  { id: 'all', label: 'All Signals (43)' },
  { id: 'clock', label: 'Game Clock' },
  { id: 'scoring', label: 'Scoring' },
  { id: 'subs-timeouts', label: 'Subs & Time-outs' },
  { id: 'informative', label: 'Informative' },
  { id: 'violations', label: 'Violations' },
  { id: 'numbers', label: 'Player Numbers' },
  { id: 'fouls', label: 'Type of Fouls' },
  { id: 'special-fouls', label: 'Special Fouls (2026)' },
  { id: 'penalties', label: 'Penalties & FTs' },
];

export function FibaDiagram({ id }: { id: FibaDiagramId }) {
  const [signalCat, setSignalCat] = useState<SignalCategory>('all');

  if (id === 'full-court') {
    return (
      <figure className="my-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
        <svg viewBox="0 0 640 360" className="h-auto w-full" role="img" aria-label="Diagram 1: Full size FIBA basketball court">
          <rect x="20" y="20" width="600" height="320" rx="6" fill="#0b1b47" stroke="#2c4494" strokeWidth="1.5" />
          <rect x="40" y="40" width="560" height="300" fill="#10255e" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="320" y1="40" x2="320" y2="340" stroke="#ffffff" strokeWidth="2" />
          <circle cx="320" cy="190" r="36" fill="none" stroke="#ffffff" strokeWidth="2" />

          {/* Left Restricted Area */}
          <rect x="40" y="141" width="116" height="98" fill="#17337d" stroke="#ffffff" strokeWidth="2" />
          <path d="M 156 154 A 36 36 0 0 1 156 226" fill="none" stroke="#ffffff" strokeWidth="2" />
          <path d="M 156 154 A 36 36 0 0 0 156 226" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1="64" y1="172" x2="64" y2="208" stroke="#f2a501" strokeWidth="3" />
          <circle cx="71.5" cy="190" r="6" fill="none" stroke="#f2a501" strokeWidth="2" />
          <path d="M 64 165 L 71.5 165 A 25 25 0 0 1 71.5 215 L 64 215" fill="none" stroke="#f2a501" strokeWidth="1.5" />
          <line x1="40" y1="58" x2="99" y2="58" stroke="#ffffff" strokeWidth="2" />
          <line x1="40" y1="322" x2="99" y2="322" stroke="#ffffff" strokeWidth="2" />
          <path d="M 99 58 A 135 135 0 0 1 99 322" fill="none" stroke="#ffffff" strokeWidth="2" />

          {/* Right Restricted Area */}
          <rect x="484" y="141" width="116" height="98" fill="#17337d" stroke="#ffffff" strokeWidth="2" />
          <path d="M 484 154 A 36 36 0 0 0 484 226" fill="none" stroke="#ffffff" strokeWidth="2" />
          <path d="M 484 154 A 36 36 0 0 1 484 226" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="5 5" />
          <line x1="576" y1="172" x2="576" y2="208" stroke="#f2a501" strokeWidth="3" />
          <circle cx="568.5" cy="190" r="6" fill="none" stroke="#f2a501" strokeWidth="2" />
          <path d="M 576 165 L 568.5 165 A 25 25 0 0 0 568.5 215 L 576 215" fill="none" stroke="#f2a501" strokeWidth="1.5" />
          <line x1="600" y1="58" x2="541" y2="58" stroke="#ffffff" strokeWidth="2" />
          <line x1="600" y1="322" x2="541" y2="322" stroke="#ffffff" strokeWidth="2" />
          <path d="M 541 58 A 135 135 0 0 0 541 322" fill="none" stroke="#ffffff" strokeWidth="2" />

          {/* Throw-in lines */}
          <line x1="206.5" y1="33" x2="206.5" y2="40" stroke="#f2a501" strokeWidth="2.5" />
          <line x1="433.5" y1="33" x2="433.5" y2="40" stroke="#f2a501" strokeWidth="2.5" />

          {/* Scorer's table & Team Benches */}
          <rect x="265" y="16" width="110" height="16" rx="3" fill="#2a3f87" stroke="#f2a501" strokeWidth="1.5" />
          <text x="320" y="27" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
            SCORER&apos;S TABLE
          </text>
          <rect x="115" y="18" width="110" height="14" rx="3" fill="#16224d" stroke="#8c9bc4" strokeWidth="1" />
          <text x="170" y="28" textAnchor="middle" fill="#c7d2fe" fontSize="8.5" fontWeight="bold">
            TEAM BENCH A
          </text>
          <rect x="415" y="18" width="110" height="14" rx="3" fill="#16224d" stroke="#8c9bc4" strokeWidth="1" />
          <text x="470" y="28" textAnchor="middle" fill="#c7d2fe" fontSize="8.5" fontWeight="bold">
            TEAM BENCH B
          </text>

          <text x="320" y="353" textAnchor="middle" fill="#f2a501" fontSize="11" fontWeight="bold">
            28.00 m (Length)
          </text>
          <text
            x="14"
            y="190"
            textAnchor="middle"
            fill="#f2a501"
            fontSize="11"
            fontWeight="bold"
            transform="rotate(-90 14 190)"
          >
            15.00 m (Width)
          </text>
          <text x="180" y="118" fill="#c7d2fe" fontSize="10" fontWeight="bold">
            3PT Arc: 6.75 m
          </text>
          <text x="320" y="194" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">
            r = 1.80 m
          </text>
          <text x="206.5" y="51" textAnchor="middle" fill="#fde68a" fontSize="8.5">
            8.325 m
          </text>
          <text x="433.5" y="51" textAnchor="middle" fill="#fde68a" fontSize="8.5">
            8.325 m
          </text>
        </svg>
        <figcaption className="mt-1.5 text-center text-[11px] text-[#8c9bc4]">
          Diagram 1 · Official FIBA Full Size Court (28 m × 15 m, 6.75 m 3-point arc, 8.325 m throw-in lines)
        </figcaption>
      </figure>
    );
  }

  if (id === 'restricted-area') {
    return (
      <figure className="my-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
        <svg viewBox="0 0 520 260" className="mx-auto h-auto max-w-[460px]" role="img" aria-label="Diagram 2: Restricted area and no-charge semi-circle">
          <rect x="40" y="20" width="440" height="220" fill="#10255e" stroke="#ffffff" strokeWidth="2" />
          <rect x="40" y="56" width="232" height="148" fill="#17337d" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="110" y1="48" x2="110" y2="56" stroke="#ffffff" strokeWidth="2" />
          <line x1="144" y1="48" x2="144" y2="56" stroke="#ffffff" strokeWidth="4" />
          <line x1="178" y1="48" x2="178" y2="56" stroke="#ffffff" strokeWidth="2" />
          <line x1="212" y1="48" x2="212" y2="56" stroke="#ffffff" strokeWidth="2" />

          <line x1="110" y1="204" x2="110" y2="212" stroke="#ffffff" strokeWidth="2" />
          <line x1="144" y1="204" x2="144" y2="212" stroke="#ffffff" strokeWidth="4" />
          <line x1="178" y1="204" x2="178" y2="212" stroke="#ffffff" strokeWidth="2" />
          <line x1="212" y1="204" x2="212" y2="212" stroke="#ffffff" strokeWidth="2" />

          <path d="M 272 56 A 74 74 0 0 1 272 204" fill="none" stroke="#ffffff" strokeWidth="2.5" />
          <line x1="88" y1="95" x2="88" y2="165" stroke="#f2a501" strokeWidth="3" />
          <circle cx="103" cy="130" r="9" fill="none" stroke="#f2a501" strokeWidth="2.5" />
          <path d="M 88 80 L 103 80 A 50 50 0 0 1 103 180 L 88 180" fill="none" stroke="#f2a501" strokeWidth="2" />

          <text x="175" y="134" textAnchor="middle" fill="#ffffff" fontSize="12" fontWeight="bold">
            5.80 m × 4.90 m
          </text>
          <text x="165" y="152" textAnchor="middle" fill="#fde68a" fontSize="10.5">
            No-Charge Semi-Circle: r = 1.25 m
          </text>
          <text x="360" y="134" fill="#c7d2fe" fontSize="11" fontWeight="bold">
            FT Semi-Circle: r = 1.80 m
          </text>
        </svg>
        <figcaption className="mt-1.5 text-center text-[11px] text-[#8c9bc4]">
          Diagram 2 · Restricted Area (5.80 m × 4.90 m), Rebound Spaces &amp; No-Charge Semi-Circle (r = 1.25 m)
        </figcaption>
      </figure>
    );
  }

  if (id === 'backboard-ring') {
    return (
      <figure className="my-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
        <svg viewBox="0 0 540 240" className="mx-auto h-auto max-w-[480px]" role="img" aria-label="Diagram 3: Backboard and ring dimensions">
          <rect x="35" y="30" width="216" height="126" fill="#10255e" stroke="#ffffff" strokeWidth="2.5" />
          <rect x="108" y="88" width="70.8" height="54" fill="none" stroke="#ffffff" strokeWidth="2" />
          <ellipse cx="143.4" cy="136" rx="27" ry="5" fill="none" stroke="#f2a501" strokeWidth="2.5" />
          <text x="143" y="20" textAnchor="middle" fill="#f2a501" fontSize="11" fontWeight="bold">
            1.80 m
          </text>
          <text x="18" y="95" textAnchor="middle" fill="#f2a501" fontSize="11" fontWeight="bold" transform="rotate(-90 18 95)">
            1.05 m
          </text>
          <text x="143" y="180" textAnchor="middle" fill="#c7d2fe" fontSize="10.5">
            Target Rectangle: 0.59 m × 0.45 m
          </text>

          <line x1="300" y1="205" x2="500" y2="205" stroke="#ffffff" strokeWidth="2" />
          <line x1="340" y1="205" x2="340" y2="85" stroke="#8c9bc4" strokeWidth="5" />
          <line x1="340" y1="95" x2="412" y2="95" stroke="#8c9bc4" strokeWidth="4" />
          <line x1="412" y1="35" x2="412" y2="125" stroke="#ffffff" strokeWidth="3.5" />
          <line x1="412" y1="112" x2="448" y2="112" stroke="#f2a501" strokeWidth="3.5" />

          <line x1="372" y1="198" x2="372" y2="212" stroke="#f2a501" strokeWidth="2.5" />
          <text x="392" y="225" textAnchor="middle" fill="#fde68a" fontSize="10">
            1.20 m inside endline
          </text>
          <text x="475" y="160" textAnchor="middle" fill="#f2a501" fontSize="11" fontWeight="bold">
            Ring: 3.05 m
          </text>
          <text x="475" y="176" textAnchor="middle" fill="#c7d2fe" fontSize="10">
            Ø 0.45 m
          </text>
        </svg>
        <figcaption className="mt-1.5 text-center text-[11px] text-[#8c9bc4]">
          Diagram 3 · Backboard (1.80 m × 1.05 m) &amp; Ring Height (3.05 m above floor, 1.20 m inside endline)
        </figcaption>
      </figure>
    );
  }

  if (id === 'table-officials') {
    const seats = [
      { title: '1. ASSISTANT SCORER', role: 'Scoreboard & visual fouls' },
      { title: '2. SCORER', role: 'Official scoresheet & arrow' },
      { title: '3. COMMISSIONER', role: 'Supervises table (if present)' },
      { title: '4. TIMER', role: 'Game clock & time-outs' },
      { title: '5. SHOT CLOCK OP.', role: '24s / 14s shot clock' },
    ];
    return (
      <figure className="my-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
        <div className="mb-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-[#f2a501]">
          ▲ Facing Playing Court (Centre Line) ▲
        </div>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-5">
          {seats.map((s) => (
            <div key={s.title} className="rounded-lg border border-[#3a4a8f] bg-[#10255e] p-2 text-center">
              <div className="text-[10px] font-extrabold text-white">{s.title}</div>
              <div className="mt-0.5 text-[10px] text-[#c7d2fe]">{s.role}</div>
            </div>
          ))}
        </div>
        <figcaption className="mt-2 text-center text-[11px] text-[#8c9bc4]">
          Diagram 4 · Article 46 Official Scorer&apos;s Table Seating Arrangement
        </figcaption>
      </figure>
    );
  }

  // Complete Appendix A & B Illustrated Referees' Signals
  const visibleSignals =
    signalCat === 'all'
      ? ALL_FIBA_SIGNALS
      : ALL_FIBA_SIGNALS.filter((s) => s.category === signalCat);

  return (
    <figure className="my-3 rounded-xl border border-[#1a2d6b] bg-[#071233] p-3">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 px-1">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[#f2a501]">
          Appendix A · Complete Official Referees&apos; Signals ({visibleSignals.length})
        </span>
        <span className="text-[11px] text-[#8c9bc4]">
          Clock, Scoring, Substitutions, Time-outs, Violations, Numbers &amp; Fouls
        </span>
      </div>

      {/* Category Filter Pills */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {SIGNAL_TABS.map((tab) => {
          const active = signalCat === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSignalCat(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-extrabold transition ${
                active
                  ? 'bg-[#f2a501] text-black'
                  : 'border border-[#2c4494] bg-[#10255e] text-[#c7d2fe] hover:bg-[#1a3480]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Signal Cards Grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {visibleSignals.map((sig) => (
          <div
            key={`${sig.category}-${sig.code}-${sig.title}`}
            className="flex flex-col justify-between rounded-xl border border-[#2c4494] bg-[#10255e] p-2.5 text-center"
          >
            <div className="flex items-center justify-between gap-1">
              <span className="rounded bg-[#f2a501] px-1.5 py-0.5 font-mono text-[10px] font-black text-black">
                {sig.code}
              </span>
              <span className="truncate text-[10px] font-bold text-[#8c9bc4]">
                {sig.categoryLabel}
              </span>
            </div>

            <div className="my-1.5 rounded-lg bg-[#071233]/80 py-1">{sig.svg}</div>

            <div>
              <div className="text-xs font-extrabold text-white">{sig.title}</div>
              <p className="mt-0.5 text-[10.5px] leading-snug text-[#c7d2fe]">{sig.gesture}</p>
            </div>
          </div>
        ))}
      </div>

      <figcaption className="mt-2.5 text-center text-[11px] text-[#8c9bc4]">
        Appendix A &amp; Appendix B · Complete FIBA Referees&apos; Hand Signals &amp; Scoresheet Notations (2026 Edition)
      </figcaption>
    </figure>
  );
}