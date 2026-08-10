// 36 character cards shown on the intro wall.
// Edit the NAMES list below to change the name printed on each card —
// line 1 is card 01, line 2 is card 02, and so on. `palette` picks a
// color pairing from PALETTES below — change the index (0–4) to restyle
// a card without touching colors directly.
//
// All cards share the same dark fill (close to the page background) so
// nothing reads as bright/colorful against it — each palette is told
// apart only by its `outline` color (the card's border) and a matching
// tint on the card number, never by the fill itself.

// All five entries now share one outline color (a dark, slightly warm
// gray) instead of five distinct hues — cards are told apart by their
// number/name only, not by border color. The array stays five entries
// deep so nothing else that reads `palette` by index needs to change.
export const PALETTES = [
  { back: '#1D1912', outline: '#4A463D', ink: '#EDE7DA' },
  { back: '#1D1912', outline: '#4A463D', ink: '#EDE7DA' },
  { back: '#1D1912', outline: '#4A463D', ink: '#EDE7DA' },
  { back: '#1D1912', outline: '#4A463D', ink: '#EDE7DA' },
  { back: '#1D1912', outline: '#4A463D', ink: '#EDE7DA' },
];

// The editable name list — one entry per card, in order. Replace each
// placeholder with a real name; leaving fewer than 36 entries is fine,
// any remaining cards just fall back to "Nama <nomor kartu>".
export const NAMES = [
  'Adil', 'Annisa', 'Desvita', 'Dzakwan', 'Evan', 'Rohim',
  'Faris', 'Fatimah', 'Herbie', 'Rizqi', 'Imam', 'Kanaya',
  'Lusi', 'Suci', 'Mikael', 'Alfian', 'Fajri', 'Aljora',
  'Mahmud', 'Ilham', 'Kanz', 'Jibran', 'Muti', 'Nadif',
  'Quiko', 'Raffi', 'Ratna', 'Kaka', 'Rinda', 'Putri',
  'Nana', 'Silvia', 'Bima', 'Huda', 'Atta', 'Zhulkhaq',
];

function pad(n) {
  return String(n).padStart(2, '0');
}

export const characters = Array.from({ length: 36 }, (_, i) => {
  const id = i + 1;
  return {
    id,
    symbol: pad(id),
    name: NAMES[i] ?? `Nama ${id}`,
    palette: PALETTES[id % PALETTES.length],
  };
});
