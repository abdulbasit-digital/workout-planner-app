# Workout Planner & Fitness Tracker

Plan Better. Train Smarter. Track Your Progress.

A private, offline-capable workout planner and fitness tracker (installable PWA) sold as an Etsy digital product.
No server, no tracking: data is stored in each user's browser (IndexedDB + local storage).

- `public/` – the deployable site (single-file app `index.html`, `sw.js`, manifest, icons). Vercel serves this folder.
- `source/` – readable source (`src/*.js`, `style.css`, `template.html`) and `build.py`.
  Rebuild: `python3 source/build.py` then copy `source/dist/index.html` to `public/index.html`.
- `source/tests/suite.py` – Playwright test suite (200+ checks).

## Access
Buyers use **Create account** with the Etsy access code, or try the free demo (nothing saved, exports off).
The code is stored only as a SHA-256 hash in `source/src/auth.js` (`ACCESS_HASHES`). To change it, replace the hash with
`sha256("wpft:" + CODE)` where CODE is uppercase letters and digits only (e.g. `WORKOUT-ETSY` → `wpft:WORKOUTETSY`).
This is a convenience gate, not strong security: the app is client-side only.
