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

4. **Telegram Cloud Storage**:
   - Store and sync your study materials for free via the Telegram Bot API.
   - Enter your Bot Token (from `@BotFather`) and Channel/Group Chat ID in **Settings**.
   - Built-in connection tester to verify bot and channel connectivity.
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

## Telegram Cloud Storage Setup

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`, name your bot (e.g., `MyStudyBot`), and copy the **Bot Token**.
3. Create a Telegram Channel or Group (e.g. `My Study Vault`).
4. Add your bot as an **Administrator** to that channel.
5. In Vidyalaya, go to **Settings &rarr; Telegram Cloud Storage**:
   - Paste your **Bot Token**.
   - Paste your **Chat ID** or channel username (e.g. `@my_study_vault` or `-100xxxxxxxxxx`).
   - Click **Test Connection** &rarr; **Save Telegram Settings**.
6. When you upload files in the Library, they will be sent straight to your Telegram channel and available from any browser!

---

## License

MIT
