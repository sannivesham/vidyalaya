import { state, markFileStatus, getFileBlob, saveFileBlob, addNote, getNotesForFile, deleteNote, addBookmark, getBookmarksForFile, deleteBookmark, recordStudyMinutes, persist } from '../store.js'
import { downloadFileFromTelegram } from '../telegram-store.js'
import { uid, formatDate, formatFileSize, escapeHtml, playTimerChime } from '../utils.js'
import { showToast } from '../toast.js'
import { emptyState } from './dashboard.js'

let currentFileId = null
let currentBlobUrl = null
let activeTab = 'notes' // 'notes' | 'bookmarks'

// ---- Integrated 25-5 Pomodoro Study Timer State ----
const FOCUS_SECONDS = 25 * 60 // 25 minutes
const BREAK_SECONDS = 5 * 60  // 5 minutes

let timerPhase = 'focus' // 'focus' | 'break'
let timerSecondsLeft = FOCUS_SECONDS
let timerRunning = false
let timerInterval = null
let timerChimeEnabled = true
let timerCollapsed = false
let timerCyclesCompleted = 0

export function render(params, routeParam) {
  const file = state.files.find((f) => f.id === routeParam)
  if (!file) {
    return `
      <div class="max-w-4xl mx-auto py-8">
        <a href="#/library" class="btn btn-secondary mb-4 inline-flex items-center gap-1.5 text-xs">
          <i data-lucide="arrow-left" style="width:14px;height:14px"></i> Back to Library
        </a>
        ${emptyState(null, 'File not found', 'This file may have been moved or removed from your library.')}
      </div>
    `
  }

  if (currentFileId !== file.id) {
    currentFileId = file.id
    activeTab = 'notes'
    // reset timer to 25:00 focus on fresh open of a new document
    resetReaderTimer()
  }

  const subjectName = file.subject || (file.folderId ? state.folders?.find(f => f.id === file.folderId)?.name : 'General')
  const backHref = file.folderId ? `#/library?folder=${file.folderId}` : '#/library'

  return `
    <div class="max-w-5xl mx-auto flex flex-col gap-4">
      <!-- Top header with back button and file info -->
      <div class="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-paper-line dark:border-ink-soft">
        <div class="flex items-center gap-3">
          <a href="${backHref}" class="p-2 rounded-lg border border-paper-line dark:border-ink-soft hover:bg-ink/5 dark:hover:bg-paper/10 text-xs font-medium flex items-center gap-1.5" title="Back to Subject">
            <i data-lucide="arrow-left" style="width:15px;height:15px"></i> Back
          </a>
          <div>
            <h1 class="font-display text-lg md:text-xl font-semibold line-clamp-1">${escapeHtml(file.title)}</h1>
            <p class="text-xs text-ink/50 dark:text-paper/50 flex items-center gap-2">
              <span class="font-medium text-marigold-dark">${escapeHtml(subjectName)}</span>
              ${file.fileName ? `<span>&bull;</span> <span class="font-mono text-[11px]">${escapeHtml(file.fileName)}</span>` : ''}
              ${file.fileSize ? `<span>&bull;</span> <span>${formatFileSize(file.fileSize)}</span>` : ''}
            </p>
          </div>
        </div>

        <div class="flex items-center gap-1.5 flex-wrap">
          <button id="reader-bookmark-btn" class="p-2 rounded-lg border border-paper-line dark:border-ink-soft hover:bg-ink/5 dark:hover:bg-paper/10 text-xs" title="Bookmark Document">
            <i data-lucide="bookmark" style="width:15px;height:15px"></i>
          </button>
          <button id="reader-fullscreen-btn" class="p-2 rounded-lg border border-paper-line dark:border-ink-soft hover:bg-ink/5 dark:hover:bg-paper/10 text-xs" title="Fullscreen Reader">
            <i data-lucide="maximize" style="width:15px;height:15px"></i>
          </button>
          <button id="reader-download-btn" class="p-2 rounded-lg border border-paper-line dark:border-ink-soft hover:bg-ink/5 dark:hover:bg-paper/10 text-xs" title="Download File">
            <i data-lucide="download" style="width:15px;height:15px"></i>
          </button>
          <button id="reader-complete-btn" class="btn ${file.status === 'Completed' ? 'btn-secondary' : 'btn-primary'}" style="padding:0.35rem 0.8rem;font-size:0.75rem;">
            <i data-lucide="${file.status === 'Completed' ? 'check-circle-2' : 'book-open'}" style="width:14px;height:14px"></i>
            <span>${file.status === 'Completed' ? 'Completed' : 'Mark Complete'}</span>
          </button>
        </div>
      </div>

      <!-- 25-5 Study Pomodoro Timer Bar -->
      <div id="reader-timer-container" class="reader-timer-bar p-3.5 shadow-sm transition-all">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <!-- Timer Phase & Digits -->
          <div class="flex items-center gap-3">
            <div id="timer-badge" class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${timerPhase === 'focus' ? 'bg-marigold/20 text-marigold-dark border border-marigold/30' : 'bg-sage/20 text-sage-dark dark:text-sage-light border border-sage/30'}">
              <i data-lucide="${timerPhase === 'focus' ? 'flame' : 'coffee'}" style="width:13px;height:13px"></i>
              <span id="timer-phase-text">${timerPhase === 'focus' ? '25m Focus' : '5m Break'}</span>
            </div>

            <div class="flex items-baseline gap-1">
              <span id="timer-clock-digits" class="font-mono text-2xl md:text-3xl font-bold tracking-tight">
                ${formatTimerDigits(timerSecondsLeft)}
              </span>
              <span class="text-[11px] font-mono text-ink/40 dark:text-paper/40" id="timer-round-info">
                Block ${timerCyclesCompleted + 1}
              </span>
            </div>
          </div>

          <!-- Controls -->
          <div class="flex items-center gap-2">
            <button id="timer-toggle-btn" class="btn btn-primary" style="padding:0.35rem 1rem;font-size:0.8rem;">
              <i data-lucide="${timerRunning ? 'pause' : 'play'}" style="width:14px;height:14px"></i>
              <span id="timer-toggle-label">${timerRunning ? 'Pause' : 'Start Focus'}</span>
            </button>
            <button id="timer-reset-btn" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10 text-ink/60 dark:text-paper/60" title="Reset Timer">
              <i data-lucide="rotate-ccw" style="width:15px;height:15px"></i>
            </button>
            <button id="timer-skip-btn" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10 text-ink/60 dark:text-paper/60 text-xs font-medium" title="Skip to next phase">
              <i data-lucide="skip-forward" style="width:15px;height:15px"></i>
            </button>
            <button id="timer-chime-btn" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10 ${timerChimeEnabled ? 'text-marigold-dark' : 'text-ink/30 dark:text-paper/30'}" title="Toggle Chime Sound">
              <i data-lucide="${timerChimeEnabled ? 'volume-2' : 'volume-x'}" style="width:15px;height:15px"></i>
            </button>
          </div>
        </div>

        <!-- Progress bar for the 25 or 5 min cycle -->
        <div class="w-full h-1.5 rounded-full bg-paper-line dark:bg-ink-soft overflow-hidden mt-3">
          <div id="timer-progress-bar" class="h-full rounded-full transition-all duration-500 ${timerPhase === 'focus' ? 'bg-marigold' : 'bg-sage'}" style="width:${calculateTimerPercent()}%"></div>
        </div>
      </div>

      <!-- Main Reader Viewport Container -->
      <div id="reader-viewport" class="bg-white dark:bg-ink-light border border-paper-line dark:border-ink-soft rounded-xl min-h-[60vh] max-h-[82vh] h-[72vh] flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
        <div class="flex flex-col items-center justify-center gap-3 p-8 text-center text-ink/50 dark:text-paper/50">
          <i data-lucide="loader-2" class="animate-spin text-marigold-dark" style="width:32px;height:32px"></i>
          <p class="text-sm font-medium">Loading document viewer&hellip;</p>
        </div>
      </div>

      <!-- PPTX Slide Navigation Controls (Visible only for PPTX files) -->
      <div id="pptx-controls-bar" class="hidden flex items-center justify-between gap-3 p-3 rounded-lg border border-paper-line dark:border-ink-soft bg-paper-dim/40 dark:bg-ink-light/40">
        <div class="flex items-center gap-2">
          <button id="pptx-prev-btn" class="btn btn-secondary" style="padding:0.3rem 0.75rem;font-size:0.75rem;">
            <i data-lucide="chevron-left" style="width:14px;height:14px"></i> Prev Slide
          </button>
          <span id="pptx-slide-indicator" class="text-xs font-mono font-semibold px-2">Slide 1</span>
          <button id="pptx-next-btn" class="btn btn-secondary" style="padding:0.3rem 0.75rem;font-size:0.75rem;">
            Next Slide <i data-lucide="chevron-right" style="width:14px;height:14px"></i>
          </button>
        </div>
        <p class="text-xs text-ink/50 dark:text-paper/50 font-mono">PPTX In-Browser Presentation</p>
      </div>

      <!-- Notes & Bookmarks Section -->
      <div class="mt-2">
        <div class="flex gap-2 mb-4 border-b border-paper-line dark:border-ink-soft pb-2">
          <button class="chip ${activeTab === 'notes' ? 'active' : ''}" id="tab-notes-btn">
            <i data-lucide="notebook-pen" style="width:13px;height:13px" class="inline mr-1"></i> Study Notes
          </button>
          <button class="chip ${activeTab === 'bookmarks' ? 'active' : ''}" id="tab-bookmarks-btn">
            <i data-lucide="bookmark" style="width:13px;height:13px" class="inline mr-1"></i> Bookmarks
          </button>
        </div>

        <div id="reader-tab-content" class="notebook-rule"></div>
      </div>
    </div>
  `
}

function formatTimerDigits(totalSeconds) {
  const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${m}:${s}`
}

function calculateTimerPercent() {
  const total = timerPhase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS
  const elapsed = total - timerSecondsLeft
  return Math.min(100, Math.max(0, (elapsed / total) * 100))
}

function updateTimerUI() {
  const clockDigits = document.getElementById('timer-clock-digits')
  if (clockDigits) clockDigits.textContent = formatTimerDigits(timerSecondsLeft)

  const progressBar = document.getElementById('timer-progress-bar')
  if (progressBar) {
    progressBar.style.width = `${calculateTimerPercent()}%`
    progressBar.className = `h-full rounded-full transition-all duration-500 ${timerPhase === 'focus' ? 'bg-marigold' : 'bg-sage'}`
  }

  const badge = document.getElementById('timer-badge')
  const phaseText = document.getElementById('timer-phase-text')
  if (badge && phaseText) {
    const isFocus = timerPhase === 'focus'
    phaseText.textContent = isFocus ? '25m Focus' : '5m Break'
    badge.className = `px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isFocus ? 'bg-marigold/20 text-marigold-dark border border-marigold/30' : 'bg-sage/20 text-sage-dark dark:text-sage-light border border-sage/30'}`
    const icon = badge.querySelector('i')
    if (icon) {
      icon.setAttribute('data-lucide', isFocus ? 'flame' : 'coffee')
      window.lucide?.createIcons()
    }
  }

  const toggleBtn = document.getElementById('timer-toggle-btn')
  const toggleLabel = document.getElementById('timer-toggle-label')
  if (toggleBtn && toggleLabel) {
    toggleLabel.textContent = timerRunning ? 'Pause' : (timerPhase === 'focus' ? 'Start Focus' : 'Start Break')
    const ic = toggleBtn.querySelector('i')
    if (ic) {
      ic.setAttribute('data-lucide', timerRunning ? 'pause' : 'play')
      window.lucide?.createIcons()
    }
  }

  const roundInfo = document.getElementById('timer-round-info')
  if (roundInfo) {
    roundInfo.textContent = `Block ${timerCyclesCompleted + 1}`
  }
}

function startTimer() {
  if (timerRunning) return
  timerRunning = true
  updateTimerUI()

  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    timerSecondsLeft--
    if (timerSecondsLeft <= 0) {
      onTimerPhaseCompleted()
    } else {
      updateTimerUI()
    }
  }, 1000)
}

function pauseTimer() {
  timerRunning = false
  clearInterval(timerInterval)
  updateTimerUI()
}

function resetReaderTimer() {
  pauseTimer()
  timerPhase = 'focus'
  timerSecondsLeft = FOCUS_SECONDS
  updateTimerUI()
}

function onTimerPhaseCompleted() {
  clearInterval(timerInterval)
  timerRunning = false

  if (timerPhase === 'focus') {
    // 25 mins focus finished!
    recordStudyMinutes(25)
    timerCyclesCompleted++
    if (timerChimeEnabled) playTimerChime('focus')
    showToast('🎉 25-minute focus complete! Time for a refreshing 5-minute break.', 'success')

    // Switch to break
    timerPhase = 'break'
    timerSecondsLeft = BREAK_SECONDS
  } else {
    // 5 mins break finished!
    if (timerChimeEnabled) playTimerChime('break')
    showToast('☕ Break finished! Ready for the next 25-minute focus session?', 'success')

    // Switch to focus
    timerPhase = 'focus'
    timerSecondsLeft = FOCUS_SECONDS
  }

  updateTimerUI()
}

// ---- Document Viewer Engine ----

async function loadDocumentIntoViewer(file) {
  const viewport = document.getElementById('reader-viewport')
  if (!viewport) return

  if (currentBlobUrl) {
    URL.revokeObjectURL(currentBlobUrl)
    currentBlobUrl = null
  }

  // 1. Try local IndexedDB first
  let blob = await getFileBlob(file.id)

  // 2. If not in IndexedDB but on Telegram, download from Telegram
  if (!blob && file.telegramFileId) {
    viewport.innerHTML = `
      <div class="flex flex-col items-center justify-center gap-3 p-8 text-center">
        <i data-lucide="cloud-download" class="animate-bounce text-marigold-dark" style="width:36px;height:36px"></i>
        <h4 class="font-display text-base font-semibold">Downloading from Telegram Cloud</h4>
        <p class="text-xs text-ink/50 dark:text-paper/50 max-w-xs">Fetching file bytes and caching locally for instant reading...</p>
      </div>
    `
    window.lucide?.createIcons()
    try {
      blob = await downloadFileFromTelegram(file.telegramFileId)
      if (blob) {
        await saveFileBlob(file.id, blob)
      }
    } catch (err) {
      console.warn('Telegram download error:', err)
    }
  }

  // 3. If still no blob, show upload/fallback message
  if (!blob) {
    viewport.innerHTML = `
      <div class="flex flex-col items-center justify-center gap-3 p-8 text-center text-ink/60 dark:text-paper/60">
        <i data-lucide="file-warning" class="text-rust" style="width:36px;height:36px"></i>
        <h4 class="font-display text-base font-semibold">Document not available in local cache</h4>
        <p class="text-xs max-w-sm">The file data could not be found locally or on Telegram. Try re-uploading the file into this subject folder.</p>
        <a href="#/library" class="btn btn-primary mt-2 text-xs">Back to Library</a>
      </div>
    `
    window.lucide?.createIcons()
    return
  }

  currentBlobUrl = URL.createObjectURL(blob)

  const ext = (file.fileName || '').split('.').pop().toLowerCase()
  const mime = (file.fileType || '').toLowerCase()

  // ---- A: PDF Document ----
  if (ext === 'pdf' || mime === 'application/pdf') {
    viewport.innerHTML = `
      <iframe src="${currentBlobUrl}#view=FitH" class="w-full h-full border-0 rounded-xl" title="${escapeHtml(file.title)}" allowfullscreen></iframe>
    `
    return
  }

  // ---- B: PPTX / PPT Presentation ----
  if (['pptx', 'ppt'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    renderPptxViewer(viewport, blob, file)
    return
  }

  // ---- C: Images ----
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif'].includes(ext)) {
    viewport.innerHTML = `
      <div class="w-full h-full flex items-center justify-center p-4 overflow-auto bg-paper-dim/30 dark:bg-ink-soft/20">
        <img id="reader-image" src="${currentBlobUrl}" alt="${escapeHtml(file.title)}" class="max-w-full max-h-full object-contain rounded shadow-lg transition-transform" />
      </div>
    `
    return
  }

  // ---- D: Text / Markdown ----
  if (mime.startsWith('text/') || ['txt', 'md', 'csv', 'json'].includes(ext)) {
    try {
      const text = await blob.text()
      viewport.innerHTML = `
        <div class="w-full h-full overflow-y-auto p-6 md:p-8 font-mono text-xs md:text-sm whitespace-pre-wrap text-left leading-relaxed">
          ${escapeHtml(text)}
        </div>
      `
      return
    } catch (e) {
      console.warn('Text decode error', e)
    }
  }

  // ---- E: Other Office Docs (DOCX / etc) ----
  viewport.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-3 p-8 text-center text-ink/70 dark:text-paper/70">
      <div class="w-16 h-16 rounded-2xl bg-marigold/15 flex items-center justify-center mb-1">
        <i data-lucide="file-text" class="text-marigold-dark" style="width:32px;height:32px"></i>
      </div>
      <h4 class="font-display text-base font-semibold">${escapeHtml(file.title)}</h4>
      <p class="text-xs max-w-sm text-ink/50 dark:text-paper/50">This document (${ext.toUpperCase()}) can be downloaded or opened with your device viewer.</p>
      <a href="${currentBlobUrl}" download="${escapeHtml(file.fileName || file.title)}" class="btn btn-primary mt-2">
        <i data-lucide="download" style="width:15px;height:15px"></i> Download to Read
      </a>
    </div>
  `
  window.lucide?.createIcons()
}

/**
 * In-browser PPTX renderer using pptx-preview library.
 */
async function renderPptxViewer(viewport, blob, file) {
  viewport.innerHTML = `
    <div id="pptx-wrapper" class="pptx-render-wrapper w-full h-full flex items-center justify-center overflow-auto p-4">
      <div class="flex flex-col items-center gap-2 text-ink/50 dark:text-paper/50">
        <i data-lucide="loader-2" class="animate-spin text-marigold-dark" style="width:28px;height:28px"></i>
        <p class="text-xs font-mono">Rendering presentation slides&hellip;</p>
      </div>
    </div>
  `
  window.lucide?.createIcons()

  const pptxControls = document.getElementById('pptx-controls-bar')
  if (pptxControls) pptxControls.classList.remove('hidden')

  try {
    const arrayBuffer = await blob.arrayBuffer()
    const wrapper = document.getElementById('pptx-wrapper')

    if (window.pptxPreview && typeof window.pptxPreview.init === 'function') {
      wrapper.innerHTML = ''
      const previewer = window.pptxPreview.init(wrapper, {
        width: 960,
        height: 540,
        mode: 'slide',
      })
      await previewer.preview(arrayBuffer)
      showToast('Presentation loaded in-browser!', 'success')
    } else {
      // Fallback if CDN blocked
      wrapper.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div class="w-16 h-16 rounded-2xl bg-marigold/15 flex items-center justify-center mb-1">
            <i data-lucide="presentation" class="text-marigold-dark" style="width:32px;height:32px"></i>
          </div>
          <h4 class="font-display text-base font-semibold">PowerPoint Presentation Ready</h4>
          <p class="text-xs text-ink/50 dark:text-paper/50 max-w-sm">
            ${escapeHtml(file.fileName || file.title)} (${formatFileSize(file.fileSize || blob.size)})
          </p>
          <div class="flex gap-2 mt-2">
            <a href="${currentBlobUrl}" download="${escapeHtml(file.fileName || file.title)}" class="btn btn-primary text-xs">
              <i data-lucide="download" style="width:14px;height:14px"></i> Download PPTX
            </a>
          </div>
        </div>
      `
      window.lucide?.createIcons()
    }
  } catch (err) {
    console.warn('PPTX render error:', err)
    const wrapper = document.getElementById('pptx-wrapper')
    if (wrapper) {
      wrapper.innerHTML = `
        <div class="flex flex-col items-center justify-center gap-3 p-8 text-center">
          <i data-lucide="presentation" class="text-marigold-dark" style="width:36px;height:36px"></i>
          <h4 class="font-display text-base font-semibold">PowerPoint Presentation</h4>
          <p class="text-xs text-ink/50 dark:text-paper/50 max-w-sm">Direct slide rendering for this file can be viewed by downloading or opening in your office viewer.</p>
          <a href="${currentBlobUrl}" download="${escapeHtml(file.fileName || file.title)}" class="btn btn-primary text-xs">
            <i data-lucide="download" style="width:14px;height:14px"></i> Download PPTX
          </a>
        </div>
      `
      window.lucide?.createIcons()
    }
  }
}

// ---- Notes and Bookmarks Tab ----

async function renderTabContent(fileId) {
  const el = document.getElementById('reader-tab-content')
  if (!el) return

  if (activeTab === 'notes') {
    const notes = await getNotesForFile(fileId)
    el.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <i data-lucide="notebook-pen" class="text-marigold-dark" style="width:16px;height:16px"></i>
        <h3 class="font-display text-sm font-semibold">Quick Study Notes</h3>
      </div>
      <div class="flex gap-2 mb-4">
        <textarea id="note-draft" placeholder="Type key insights, formulas, or reminders from this document\u2026" rows="2" class="input flex-1 resize-none"></textarea>
        <button id="add-note-btn" class="btn btn-primary self-end"><i data-lucide="plus" style="width:14px;height:14px"></i> Add</button>
      </div>
      <div id="notes-list">
        ${notes.length === 0 ? emptyState(null, 'No notes yet', 'Jot down formulas and definitions as you read.') : `
          <ul class="flex flex-col gap-2">
            ${notes.map((n) => `
              <li class="flex items-start justify-between gap-3 p-3 rounded-lg bg-paper-dim/60 dark:bg-ink-soft/40 border border-paper-line/50 dark:border-ink-soft">
                <div class="flex-1">
                  <p class="text-xs md:text-sm leading-relaxed">${escapeHtml(n.text)}</p>
                  <p class="text-[10px] text-ink/40 dark:text-paper/40 mt-1 font-mono">${formatDate(n.createdAt)}</p>
                </div>
                <button class="delete-note-btn p-1 text-ink/40 hover:text-rust" data-id="${n.id}" title="Delete note">
                  <i data-lucide="trash-2" style="width:13px;height:13px"></i>
                </button>
              </li>`).join('')}
          </ul>`}
      </div>
    `
    window.lucide?.createIcons()

    document.getElementById('add-note-btn')?.addEventListener('click', async () => {
      const draft = document.getElementById('note-draft').value.trim()
      if (!draft) return
      await addNote({ id: uid(), fileId, text: draft, createdAt: new Date().toISOString() })
      showToast('Note added', 'success')
      renderTabContent(fileId)
    })

    el.querySelectorAll('.delete-note-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteNote(btn.dataset.id)
        showToast('Note deleted', 'success')
        renderTabContent(fileId)
      })
    })
  } else {
    const bookmarks = (await getBookmarksForFile(fileId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    el.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-display text-sm font-semibold flex items-center gap-2">
          <i data-lucide="bookmark" class="text-marigold-dark" style="width:16px;height:16px"></i> Saved Bookmarks
        </h3>
        <button id="add-bm-btn" class="btn btn-secondary" style="padding:0.25rem 0.6rem;font-size:0.75rem;">
          <i data-lucide="plus" style="width:12px;height:12px"></i> Add Bookmark
        </button>
      </div>
      <div>
        ${bookmarks.length === 0 ? emptyState('bookmark', 'No bookmarks yet', 'Bookmark key sections to jump back quickly.') : `
          <ul class="flex flex-col gap-2">
            ${bookmarks.map((b) => `
              <li class="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-paper-line dark:border-ink-soft bg-paper-dim/40 dark:bg-ink-light">
                <span class="flex items-center gap-2 text-xs font-medium">
                  <i data-lucide="bookmark" class="text-marigold-dark" style="width:13px;height:13px"></i>
                  Bookmarked on ${formatDate(b.createdAt)}
                </span>
                <button class="delete-bm-btn p-1 text-ink/40 hover:text-rust" data-id="${b.id}" title="Remove bookmark">
                  <i data-lucide="trash-2" style="width:13px;height:13px"></i>
                </button>
              </li>
            `).join('')}
          </ul>
        `}
      </div>
    `
    window.lucide?.createIcons()

    document.getElementById('add-bm-btn')?.addEventListener('click', async () => {
      await addBookmark({ id: uid(), fileId, createdAt: new Date().toISOString() })
      showToast('Bookmarked!', 'success')
      renderTabContent(fileId)
    })

    el.querySelectorAll('.delete-bm-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteBookmark(btn.dataset.id)
        showToast('Bookmark removed', 'success')
        renderTabContent(fileId)
      })
    })
  }
}

// ---- Mount Lifecycle ----

export function mount(params, routeParam) {
  const file = state.files.find((f) => f.id === routeParam)
  if (!file) return
  window.lucide?.createIcons()

  // Mark reading status
  if (file.status === 'Not Started') {
    markFileStatus(file.id, 'Reading')
  }

  // Load document
  loadDocumentIntoViewer(file)
  renderTabContent(file.id)

  // 25-5 Timer events
  document.getElementById('timer-toggle-btn')?.addEventListener('click', () => {
    if (timerRunning) {
      pauseTimer()
    } else {
      startTimer()
    }
  })

  document.getElementById('timer-reset-btn')?.addEventListener('click', () => {
    resetReaderTimer()
    showToast('Timer reset to 25m Focus', 'success')
  })

  document.getElementById('timer-skip-btn')?.addEventListener('click', () => {
    onTimerPhaseCompleted()
  })

  document.getElementById('timer-chime-btn')?.addEventListener('click', () => {
    timerChimeEnabled = !timerChimeEnabled
    showToast(timerChimeEnabled ? 'Timer sound chime enabled 🔔' : 'Timer sound muted 🔕', 'success')
    const btn = document.getElementById('timer-chime-btn')
    if (btn) {
      btn.className = `p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10 ${timerChimeEnabled ? 'text-marigold-dark' : 'text-ink/30 dark:text-paper/30'}`
      const ic = btn.querySelector('i')
      if (ic) {
        ic.setAttribute('data-lucide', timerChimeEnabled ? 'volume-2' : 'volume-x')
        window.lucide?.createIcons()
      }
    }
  })

  // Fullscreen button
  const fsBtn = document.getElementById('reader-fullscreen-btn')
  fsBtn?.addEventListener('click', () => {
    const vp = document.getElementById('reader-viewport')
    if (!document.fullscreenElement) {
      vp?.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  })

  // Bookmark header button
  document.getElementById('reader-bookmark-btn')?.addEventListener('click', async () => {
    await addBookmark({ id: uid(), fileId: file.id, createdAt: new Date().toISOString() })
    showToast('Document Bookmarked!', 'success')
    if (activeTab === 'bookmarks') renderTabContent(file.id)
  })

  // Download button
  document.getElementById('reader-download-btn')?.addEventListener('click', async () => {
    if (currentBlobUrl) {
      const a = document.createElement('a')
      a.href = currentBlobUrl
      a.download = file.fileName || `${file.title}.pdf`
      a.click()
      showToast('Downloading file...', 'success')
    } else {
      showToast('Preparing file for download...', 'info')
      const blob = await getFileBlob(file.id)
      if (blob) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = file.fileName || file.title
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 4000)
      } else {
        showToast('Could not retrieve file blob', 'error')
      }
    }
  })

  // Mark complete button
  document.getElementById('reader-complete-btn')?.addEventListener('click', () => {
    const isComp = file.status === 'Completed'
    markFileStatus(file.id, isComp ? 'Reading' : 'Completed')
    showToast(isComp ? 'Marked as reading' : '🎉 Document marked as completed!', 'success')
    const btn = document.getElementById('reader-complete-btn')
    if (btn) {
      const newComp = file.status === 'Completed'
      btn.className = `btn ${newComp ? 'btn-secondary' : 'btn-primary'}`
      btn.innerHTML = `<i data-lucide="${newComp ? 'check-circle-2' : 'book-open'}" style="width:14px;height:14px"></i> <span>${newComp ? 'Completed' : 'Mark Complete'}</span>`
      window.lucide?.createIcons()
    }
  })

  // Tabs
  document.getElementById('tab-notes-btn')?.addEventListener('click', () => {
    activeTab = 'notes'
    document.getElementById('tab-notes-btn').classList.add('active')
    document.getElementById('tab-bookmarks-btn').classList.remove('active')
    renderTabContent(file.id)
  })

  document.getElementById('tab-bookmarks-btn')?.addEventListener('click', () => {
    activeTab = 'bookmarks'
    document.getElementById('tab-bookmarks-btn').classList.add('active')
    document.getElementById('tab-notes-btn').classList.remove('active')
    renderTabContent(file.id)
  })
}
