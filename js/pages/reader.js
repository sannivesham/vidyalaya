import { state, markFileStatus, addNote, getNotesForFile, deleteNote, addBookmark, getBookmarksForFile, deleteBookmark, persist } from '../store.js'
import { downloadFile } from '../drive-store.js'
import { uid, formatDate, escapeHtml } from '../utils.js'
import { showToast } from '../toast.js'
import { emptyState } from './dashboard.js'

let tab = 'notes'
let currentFileId = null

export function render(params, routeParam) {
  const file = state.files.find((f) => f.id === routeParam)
  if (!file) {
    return `<div class="max-w-4xl mx-auto"><a href="#/library" class="text-sm text-ink/60 dark:text-paper/60">&larr; Back to Library</a>${emptyState(null, 'File not found', 'It may have been removed from your library.')}</div>`
  }

  if (currentFileId !== file.id) { currentFileId = file.id; tab = 'notes' }

  return `
    <div class="max-w-4xl mx-auto">
      <a href="#/library" class="flex items-center gap-1.5 text-sm text-ink/60 dark:text-paper/60 hover:text-marigold-dark mb-4 w-fit">
        <i data-lucide="arrow-left" style="width:15px;height:15px"></i> Back to Library
      </a>
      <h1 class="font-display text-xl font-semibold mb-1">${escapeHtml(file.title)}</h1>
      <p class="text-sm text-ink/50 dark:text-paper/50 mb-5">${escapeHtml(file.category)}${file.subject ? ' &middot; ' + escapeHtml(file.subject) : ''}</p>

      <div class="flex items-center justify-between gap-2 flex-wrap px-4 py-2.5 rounded-lg border border-paper-line dark:border-ink-soft mb-4">
        <p class="text-xs text-ink/40 dark:text-paper/40">Use the viewer's own controls below to navigate pages and zoom.</p>
        <div class="flex items-center gap-1">
          <button id="bookmark-page" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10" title="Bookmark this file"><i data-lucide="bookmark" style="width:15px;height:15px"></i></button>
          <button id="fullscreen-toggle" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10" title="Fullscreen"><i data-lucide="maximize" style="width:15px;height:15px"></i></button>
          <button id="download-file" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10" title="Download"><i data-lucide="download" style="width:15px;height:15px"></i></button>
          <button id="mark-complete" class="btn ${file.status === 'Completed' ? 'btn-secondary' : 'btn-primary'} ml-1" style="padding:0.3rem 0.75rem;font-size:0.75rem;">
            <i data-lucide="check-circle-2" style="width:14px;height:14px"></i> ${file.status === 'Completed' ? 'Completed' : 'Mark Complete'}
          </button>
        </div>
      </div>

      <div id="reader-viewport" class="bg-white dark:bg-ink-light border border-paper-line dark:border-ink-soft rounded-xl h-[65vh] md:h-[75vh] flex items-center justify-center overflow-hidden mb-6">
        <p class="text-sm text-ink/40 dark:text-paper/40">Preparing preview&hellip;</p>
      </div>

      <div class="flex gap-2 mb-4">
        <button class="chip ${tab === 'notes' ? 'active' : ''}" id="tab-notes">Notes</button>
        <button class="chip ${tab === 'bookmarks' ? 'active' : ''}" id="tab-bookmarks">Bookmarks</button>
      </div>

      <div id="tab-content" class="notebook-rule"></div>
    </div>
  `
}

function loadViewer(file) {
  const viewport = document.getElementById('reader-viewport')
  if (!viewport) return

  if (!file.driveFileId) {
    viewport.innerHTML = file.driveStatus === 'uploading'
      ? `<p class="text-sm text-ink/40 dark:text-paper/40">Still syncing to Drive&hellip; try again shortly.</p>`
      : `<p class="text-sm text-ink/40 dark:text-paper/40">No preview available.</p>`
    return
  }

  // Google Drive's own viewer renders PDFs, Office docs (ppt/pptx/doc/docx),
  // and images inline, using the Google session already signed into this
  // browser — no separate download or token handling needed just to preview.
  viewport.innerHTML = `<iframe src="https://drive.google.com/file/d/${file.driveFileId}/preview" class="w-full h-full border-0" allow="autoplay"></iframe>`
}

async function renderTabContent(fileId) {
  const el = document.getElementById('tab-content')
  if (!el) return

  if (tab === 'notes') {
    const notes = await getNotesForFile(fileId)
    el.innerHTML = `
      <div class="flex items-center gap-2 mb-3">
        <i data-lucide="notebook-pen" class="text-marigold-dark" style="width:16px;height:16px"></i>
        <h3 class="font-display text-sm font-semibold">Notes</h3>
      </div>
      <div class="flex gap-2 mb-4">
        <textarea id="note-draft" placeholder="Write a note about this page\u2026" rows="2" class="input flex-1 resize-none"></textarea>
        <button id="add-note" class="btn btn-primary self-end">Add</button>
      </div>
      <div id="notes-list">
        ${notes.length === 0 ? emptyState(null, 'No notes yet', 'Jot down what matters as you read.') : `
          <ul class="flex flex-col gap-2">
            ${notes.map((n) => `
              <li class="flex items-start justify-between gap-2 p-3 rounded-lg bg-paper-dim/60 dark:bg-ink-soft/40">
                <div><p class="text-sm">${escapeHtml(n.text)}</p><p class="text-[10px] text-ink/40 dark:text-paper/40 mt-1 font-mono">${formatDate(n.createdAt)}</p></div>
                <button class="delete-note" data-id="${n.id}"><i data-lucide="trash-2" style="width:14px;height:14px" class="text-ink/40 dark:text-paper/40"></i></button>
              </li>`).join('')}
          </ul>`}
      </div>
    `
    window.lucide?.createIcons()
    document.getElementById('add-note').addEventListener('click', async () => {
      const draft = document.getElementById('note-draft').value.trim()
      if (!draft) return
      await addNote({ id: uid(), fileId, text: draft, createdAt: new Date().toISOString() })
      renderTabContent(fileId)
    })
    el.querySelectorAll('.delete-note').forEach((btn) => btn.addEventListener('click', async () => {
      await deleteNote(btn.dataset.id)
      renderTabContent(fileId)
    }))
  } else {
    const bookmarks = (await getBookmarksForFile(fileId)).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    el.innerHTML = bookmarks.length === 0 ? emptyState('bookmark', 'No bookmarks', 'Bookmark this file to find it fast later.') : `
      <ul class="flex flex-col gap-2">
        ${bookmarks.map((b) => `
          <li class="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-paper-line dark:border-ink-soft">
            <span class="flex items-center gap-2 text-sm font-medium"><i data-lucide="bookmark" class="text-marigold-dark" style="width:13px;height:13px"></i> ${formatDate(b.createdAt)}</span>
            <button class="delete-bookmark" data-id="${b.id}"><i data-lucide="trash-2" style="width:13px;height:13px" class="text-ink/40 dark:text-paper/40"></i></button>
          </li>`).join('')}
      </ul>`
    window.lucide?.createIcons()
    el.querySelectorAll('.delete-bookmark').forEach((btn) => btn.addEventListener('click', async () => {
      await deleteBookmark(btn.dataset.id)
      renderTabContent(fileId)
    }))
  }
}

export function mount(params, routeParam) {
  const file = state.files.find((f) => f.id === routeParam)
  if (!file) return
  window.lucide?.createIcons()

  if (file.status === 'Not Started') markFileStatus(file.id, 'Reading')

  loadViewer(file)
  renderTabContent(file.id)

  document.getElementById('bookmark-page').addEventListener('click', async () => {
    await addBookmark({ id: uid(), fileId: file.id, createdAt: new Date().toISOString() })
    showToast('Bookmarked', 'success')
    if (tab === 'bookmarks') renderTabContent(file.id)
  })

  const fsBtn = document.getElementById('fullscreen-toggle')
  fsBtn.addEventListener('click', () => {
    const viewport = document.getElementById('reader-viewport')
    if (!document.fullscreenElement) {
      viewport.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  })
  document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement
    const icon = fsBtn.querySelector('i')
    if (icon) { icon.setAttribute('data-lucide', isFs ? 'minimize' : 'maximize'); window.lucide?.createIcons() }
    document.getElementById('reader-viewport')?.classList.toggle('bg-black', isFs)
  })

  document.getElementById('download-file').addEventListener('click', async () => {
    if (!file.driveFileId) return
    try {
      const blob = await downloadFile(file.driveFileId)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.fileName || file.title
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    } catch {
      showToast('Could not download file', 'error')
    }
  })

  document.getElementById('mark-complete').addEventListener('click', () => {
    markFileStatus(file.id, file.status === 'Completed' ? 'Reading' : 'Completed')
    showToast(file.status === 'Completed' ? 'Marked as reading' : 'Marked as completed', 'success')
    const btn = document.getElementById('mark-complete')
    const completed = file.status === 'Completed'
    btn.className = `btn ${completed ? 'btn-secondary' : 'btn-primary'} ml-1`
    btn.style.cssText = 'padding:0.3rem 0.75rem;font-size:0.75rem;'
    btn.innerHTML = `<i data-lucide="check-circle-2" style="width:14px;height:14px"></i> ${completed ? 'Completed' : 'Mark Complete'}`
    window.lucide?.createIcons()
  })

  document.getElementById('tab-notes').addEventListener('click', () => { tab = 'notes'; refreshTabs(); renderTabContent(file.id) })
  document.getElementById('tab-bookmarks').addEventListener('click', () => { tab = 'bookmarks'; refreshTabs(); renderTabContent(file.id) })

  function refreshTabs() {
    document.getElementById('tab-notes').classList.toggle('active', tab === 'notes')
    document.getElementById('tab-bookmarks').classList.toggle('active', tab === 'bookmarks')
  }
}
