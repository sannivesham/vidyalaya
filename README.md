# Vidyalaya (static version — no build tools required)

This is a plain HTML/CSS/JavaScript version of Vidyalaya. There is no build
step, no npm, no node_modules — you can drop this folder straight into a
GitHub repo and it will work as-is.

## How to put it live on GitHub Pages

1. Create (or reuse) a repo, e.g. `vidyalaya`.
2. Drag every file and folder from inside this `vidyalaya-static` folder
   into the repo's root on GitHub (index.html, css/, js/, favicon.svg —
   don't upload the outer `vidyalaya-static` folder itself, just its
   contents) and commit straight to `main`.
3. Go to Settings → Pages → Source → **Deploy from a branch** → choose
   `main` and `/ (root)` → Save.
4. Wait about a minute, then visit `https://<your-username>.github.io/<repo-name>/`.

That's it — no Actions, no build, no `dist` folder. Every time you want to
update the site, just edit files and re-upload/commit to `main`.

## What's inside

- `index.html` — the single page shell. Loads Tailwind and Lucide icons from
  a CDN (no install needed) plus your own `css/style.css` and `js/app.js`.
- `css/style.css` — the notebook/index-card visual style.
- `js/` — plain ES module JavaScript, organized by page (dashboard, library,
  reader, timetable, calendar, tasks, pomodoro, analytics, achievements,
  profile, settings). Browsers run these natively via
  `<script type="module">` — no bundler required.
- Routing is hash-based (`#/library`, `#/reader/<id>`, etc.), which is what
  makes this work correctly on GitHub Pages without any server config.

## Data storage

Everything is stored locally in the visitor's browser:

- **localStorage** — tasks, timetable, streaks, goals, achievements, profile
- **IndexedDB** — uploaded file blobs, notes, bookmarks

There's no backend, so data doesn't sync between devices or browsers. If you
want real accounts and cross-device sync later, that's a bigger step (e.g.
adding Firebase, like your Sannivesham project) — a separate project from
this static version.
