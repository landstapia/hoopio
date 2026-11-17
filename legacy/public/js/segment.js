/* segment.js - draws numbers as a classic 7-segment display (no font needed: each digit is a small SVG).
   seg('10:00') -> HTML for the digits. Characters: 0-9, ':', '.', '-', and ' ' (a blank digit that shows only the dim ghost segments).
   Size and color come from CSS: the digit height is 1em, the color is the text color (see css/scoreboard.css). */

const SEG_ON = {                 // which segments (a-g) are lit for each character
  0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg',
  5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g',
};
const SEG_SHAPE = {              // polygon points of each segment:   a
  a: '10,4 50,4 56,10 50,16 10,16 4,10',        //                    --
  b: '56,14 62,20 62,42 56,48 50,42 50,20',     //                 f |  | b
  c: '56,52 62,58 62,80 56,86 50,80 50,58',     //                    -- g
  d: '10,84 50,84 56,90 50,96 10,96 4,90',      //                 e |  | c
  e: '4,52 10,58 10,80 4,86 -2,80 -2,58',       //                    --
  f: '4,14 10,20 10,42 4,48 -2,42 -2,20',       //                    d
  g: '10,44 50,44 56,50 50,56 10,56 4,50',
};

function segDigit(ch) {
  const lit = SEG_ON[ch] || '';
  const shapes = Object.keys(SEG_SHAPE)
    .map(s => `<polygon class="${lit.includes(s) ? 'lit' : 'dim'}" points="${SEG_SHAPE[s]}"/>`).join('');
  return `<svg class="dg" viewBox="-4 0 68 100">${shapes}</svg>`;
}

function seg(text) {
  const parts = [...String(text)].map(ch => {
    if (ch == ':') return '<svg class="dg colon" viewBox="0 0 20 100"><circle class="lit" cx="10" cy="32" r="7"/><circle class="lit" cx="10" cy="68" r="7"/></svg>';
    if (ch == '.') return '<svg class="dg dot" viewBox="0 0 20 100"><circle class="lit" cx="10" cy="90" r="7"/></svg>';
    return segDigit(ch);
  });
  return `<span class="seg">${parts.join('')}</span>`;
}
