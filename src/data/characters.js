// 36 character cards shown on the intro wall.
// Edit the NAMES list below to change what appears on the back of each
// card when it's flipped — line 1 is card 01, line 2 is card 02, and so
// on. `mark` controls which abstract glyph is drawn on the card back (see
// CharacterCard.jsx for the shape set). `palette` picks a color pairing
// from PALETTES below — change the index (0–4) to restyle a card without
// touching colors directly.

export const PALETTES = [
  { front: '#1B1712', back: '#3550C9', ink: '#F4EFE6' }, // ultramarine
  { front: '#1B1712', back: '#D99A3D', ink: '#1B1712' }, // ochre
  { front: '#1B1712', back: '#B24D3E', ink: '#F4EFE6' }, // clay
  { front: '#1B1712', back: '#6E7B63', ink: '#F4EFE6' }, // moss
  { front: '#1B1712', back: '#F4EFE6', ink: '#1B1712' }, // plaster
];

const MARK_COUNT = 6; // number of abstract glyph variants in CharacterCard.jsx

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
    mark: id % MARK_COUNT,
    palette: PALETTES[id % PALETTES.length],
  };
});
