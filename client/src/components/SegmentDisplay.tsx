const SEG_ON: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
  '-': 'g',
};

const SEG_SHAPE: Record<string, string> = {
  a: '10,4 50,4 56,10 50,16 10,16 4,10',
  b: '56,14 62,20 62,42 56,48 50,42 50,20',
  c: '56,52 62,58 62,80 56,86 50,80 50,58',
  d: '10,84 50,84 56,90 50,96 10,96 4,90',
  e: '4,52 10,58 10,80 4,86 -2,80 -2,58',
  f: '4,14 10,20 10,42 4,48 -2,42 -2,20',
  g: '10,44 50,44 56,50 50,56 10,56 4,50',
};

function SegDigit({ ch }: { ch: string }) {
  const lit = SEG_ON[ch] || '';
  return (
    <svg className="h-[1em] w-[0.68em]" viewBox="-4 0 68 100" aria-hidden="true">
      {Object.entries(SEG_SHAPE).map(([segKey, points]) => (
        <polygon
          key={segKey}
          points={points}
          fill="currentColor"
          className={lit.includes(segKey) ? 'opacity-100' : 'opacity-[0.035]'}
        />
      ))}
    </svg>
  );
}

export function SegmentDisplay({ text, className = '' }: { text: string | number; className?: string }) {
  const chars = [...String(text)];
  return (
    <span className={`inline-flex items-center gap-[0.04em] leading-none ${className}`} aria-label={String(text)}>
      {chars.map((ch, idx) => {
        if (ch === ':') {
          return (
            <svg key={idx} className="h-[1em] w-[0.26em]" viewBox="0 0 20 100" aria-hidden="true">
              <circle cx="10" cy="32" r="7" fill="currentColor" />
              <circle cx="10" cy="68" r="7" fill="currentColor" />
            </svg>
          );
        }
        if (ch === '.') {
          return (
            <svg key={idx} className="h-[1em] w-[0.24em]" viewBox="0 0 20 100" aria-hidden="true">
              <circle cx="10" cy="90" r="7" fill="currentColor" />
            </svg>
          );
        }
        return <SegDigit key={idx} ch={ch} />;
      })}
    </span>
  );
}