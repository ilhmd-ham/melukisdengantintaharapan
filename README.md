# Mural Portfolio — Interactive Digital Art Experience

Website portfolio satu-mural yang terasa seperti sebuah karya seni interaktif:
36 kartu karakter yang bisa dibalik (3D flip) di halaman intro, transisi
sinematik ("dinding terbuka"), lalu section mural dengan reveal, parallax,
dan typography editorial besar — dibangun dengan React, Vite, GSAP +
ScrollTrigger, dan Lenis untuk smooth scroll.

## Menjalankan project

```bash
npm install
npm run dev
```

Buka URL yang muncul di terminal (biasanya `http://localhost:5173`).

Build untuk production:

```bash
npm run build
npm run preview
```

## File yang perlu Anda edit

| Yang ingin diubah | File |
| --- | --- |
| **Nama saya** | `src/data/content.js` → `ARTIST_NAME` |
| **Tagline & perkenalan singkat** | `src/data/content.js` → `INTRO_TAGLINE`, `INTRO_TEXT` |
| **Teks tombol CTA** | `src/data/content.js` → `CTA_LABEL` |
| **Slogan mural** | `src/data/content.js` → `MURAL_SLOGAN` (gunakan `\n` untuk baris baru, mis. `"THE WALL\nREMEMBERS"`) |
| **Deskripsi mural** | `src/data/content.js` → `MURAL_DESCRIPTION` |
| **Alt text gambar mural** | `src/data/content.js` → `MURAL_IMAGE_ALT` |
| **Gambar mural** | Ganti file di `public/images/mural.jpg` (gambar placeholder saat ini akan tertimpa — pertahankan nama file yang sama, atau ubah `MURAL_IMAGE` di `content.js` jika Anda memakai nama/format lain seperti `.png`) |
| **36 character card** (nama, simbol, warna, glyph) | `src/data/characters.js` — edit array `characters`, atau ubah `PALETTES` untuk skema warna |

Semua teks di atas dipusatkan di `src/data/content.js`, jadi Anda cukup edit
satu file untuk mengganti kata-kata di seluruh situs.

## Struktur project

```
src/
  components/
    CharacterCard.jsx     — satu kartu, flip 3D + glyph abstrak
    CharacterGrid.jsx     — menyusun 36 kartu jadi komposisi organik
    SmoothScroll.jsx      — provider Lenis + helper scrollTo
  sections/
    IntroSection.jsx      — halaman 1: fullscreen, 36 kartu, CTA
    MuralSection.jsx      — halaman 2: gambar, slogan, deskripsi
  animations/
    introAnimations.js    — entrance stagger & transisi "wall open"
    muralAnimations.js    — ScrollTrigger: reveal, parallax, teks
  data/
    characters.js         — data 36 kartu (generate otomatis, gampang diedit)
    content.js             — semua copy/teks situs
  styles/
    global.css             — semua styling (tokens warna, tipografi, layout)
```

## Catatan teknis

- **Aksesibilitas**: setiap kartu adalah `<button>` asli (bisa di-tab,
  Enter/Space untuk membalik, `aria-pressed` menandai status), gambar mural
  punya `alt`, dan warna kontras sudah dijaga di atas AA untuk teks utama.
- **`prefers-reduced-motion`**: jika diaktifkan di sistem pengguna, Lenis
  dimatikan, transisi "wall open" langsung menuju state akhir, dan parallax
  section mural dinonaktifkan — semua konten tetap tampil penuh.
- **Placeholder gambar**: `public/images/mural.jpg` saat ini adalah tekstur
  placeholder yang di-generate, bukan mural asli — ganti dengan foto mural
  Anda sesegera mungkin.
- Jika ingin menambah section lain di kemudian hari, ikuti pola yang sama:
  buat file di `sections/`, daftarkan animasinya di `animations/`, dan
  tambahkan ke `App.jsx`.
