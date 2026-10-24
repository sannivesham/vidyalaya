# Vidyalaya (Static Web Edition)

Vidyalaya is a student study management platform featuring subject-wise folders, an in-browser document reader for PDFs and PowerPoint presentations, an integrated 25-5 Pomodoro study timer, timetable planning, tasks, and free Telegram cloud storage.

There is **no build step, no npm build, no node_modules required** — it runs directly in the browser using modern ES modules, Tailwind CDN, and Lucide icons. You can deploy it to **GitHub Pages** by pushing to `main`.

---

## Key Features

1. **Subject-Wise Library Folders**:
   - Create and organize subjects with custom icons, color accents, and semesters.
   - Click into any subject folder to see all lecture notes, presentations, and reference materials.
   - Upload files directly into the active subject folder or easily move files between subjects.

2. **In-Browser Document Reader (PDF & PPTX)**:
   - Read PDFs directly in the browser with full zoom, fit-to-page, and fullscreen controls.
   - Preview PowerPoint presentations (`.pptx`) slide-by-slide inside the website without external software or Google Drive login.
   - View images and take persistent document notes and bookmarks as you study.

3. **Integrated 25-5 Pomodoro Study Timer**:
   - Built directly into the reader header so you never lose focus.
   - 25-minute Focus Session followed by a 5-minute Rest Break.
   - Visual progress countdown, start/pause/reset controls, and optional Web Audio chime.
   - Automatically tracks your focus minutes, updates your streak, and increments daily goals.

4. **Telegram Saved Messages Storage**:
   - Log in with Telegram in **Profile**.
   - No channels or groups required — any document you upload is delivered directly to your **personal Telegram Saved Messages / chat**.
   - Files are also cached locally in browser **IndexedDB** for instant offline opening.

---

## Quick Start (Run Locally)

You can run Vidyalaya locally using Node's built-in HTTP server:

```bash
node serve.js
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

Or use any static web server (VS Code Live Server, Python, GitHub Pages, etc.).

---

## Deploying to GitHub Pages

1. Push this repository to GitHub on the `main` branch.
2. In your repo on GitHub: Go to **Settings** &rarr; **Pages**.
3. Under **Build and deployment**:
   - Source: **Deploy from a branch**
   - Branch: `main` / `(root)`
   - Click **Save**.
4. In ~60 seconds, your site is live at `https://<your-username>.github.io/vidyalaya/`!

---

## Telegram Saved Messages Setup (Zero Hassle)

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`, give it a name, and copy the **Bot Token**.
3. In Vidyalaya, go to **Profile**:
   - Paste your **Bot Token**.
   - Enter your Telegram **@username** or user ID.
   - Click **Connect & Log in with Telegram**.
4. That's it! When you upload files in any subject folder, they are sent directly to your Telegram chat (Saved Messages) and saved in your local library. No channels, groups, or channel IDs needed!

---

## License

MIT
