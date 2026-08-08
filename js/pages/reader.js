import { state, markFileStatus, addNote, getNotesForFile, deleteNote, addBookmark, getBookmarksForFile, deleteBookmark, persist } from '../store.js'
import { downloadFile } from '../drive-store.js'
import { uid, formatDate, escapeHtml } from '../utils.js'
import { showToast } from '../toast.js'
import { emptyState } from './dashboard.js'

const TOTAL_PAGES = 24
let page = 1
let zoom = 100
let tab = 'notes'
let currentFileId = null
let blobUrl = null

export function render(params, routeParam) {
  const file = state.files.find((f) => f.id === routeParam)
  if (!file) {
    return `<div class="max-w-4xl mx-auto"><a href="#/library" class="text-sm text-ink/60 dark:text-paper/60">&larr; Back to Library</a>${emptyState(null, 'File not found', 'It may have been removed from your library.')}</div>`
  }

  if (currentFileId !== file.id) { currentFileId = file.id; page = 1; zoom = 100; tab = 'notes' }

  return `
    <div class="max-w-4xl mx-auto">
      <a href="#/library" class="flex items-center gap-1.5 text-sm text-ink/60 dark:text-paper/60 hover:text-marigold-dark mb-4 w-fit">
        <i data-lucide="arrow-left" style="width:15px;height:15px"></i> Back to Library
      </a>
      <h1 class="font-display text-xl font-semibold mb-1">${escapeHtml(file.title)}</h1>
      <p class="text-sm text-ink/50 dark:text-paper/50 mb-5">${escapeHtml(file.category)}${file.subject ? ' &middot; ' + escapeHtml(file.subject) : ''}</p>

      <div class="flex items-center justify-between gap-2 flex-wrap px-4 py-2.5 rounded-lg border border-paper-line dark:border-ink-soft mb-4">
        <div class="flex items-center gap-1">
          <button id="prev-page" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="chevron-left" style="width:16px;height:16px"></i></button>
          <span id="page-indicator" class="text-xs font-mono px-2">${page} / ${TOTAL_PAGES}</span>
          <button id="next-page" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="chevron-right" style="width:16px;height:16px"></i></button>
        </div>
        <div class="flex items-center gap-1">
          <button id="zoom-out" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="zoom-out" style="width:15px;height:15px"></i></button>
          <span id="zoom-indicator" class="text-xs font-mono w-10 text-center">${zoom}%</span>
          <button id="zoom-in" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="zoom-in" style="width:15px;height:15px"></i></button>
        </div>
        <div class="flex items-center gap-1">
          <button id="bookmark-page" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="bookmark" style="width:15px;height:15px"></i></button>
          <button id="download-file" class="p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="download" style="width:15px;height:15px"></i></button>
          <button id="mark-complete" class="btn ${file.status === 'Completed' ? 'btn-secondary' : 'btn-primary'} ml-1" style="padding:0.3rem 0.75rem;font-size:0.75rem;">
            <i data-lucide="check-circle-2" style="width:14px;height:14px"></i> ${file.status === 'Completed' ? 'Completed' : 'Mark Complete'}
          </button>
        </div>
      </div>

      <div class="progress-track mb-4"><div class="progress-fill" style="width:${Math.round((page / TOTAL_PAGES) * 100)}%"></div></div>

      <div id="reader-viewport" class="bg-white dark:bg-ink-light border border-paper-line dark:border-ink-soft rounded-xl h-[55vh] md:h-[65vh] flex items-center justify-center overflow-auto mb-6">
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

async function loadViewer(file) {
  const viewport = document.getElementById('reader-viewport')
  if (!viewport) return
  if (blobUrl) { URL.revokeObjectURL(blobUrl); blobUrl = null }

  if (!file.driveFileId) {
    viewport.innerHTML = file.driveStatus === 'uploading'
      ? `<p class="text-sm text-ink/40 dark:text-paper/40">Still syncing to Drive&hellip; try again shortly.</p>`
      : `<p class="text-sm text-ink/40 dark:text-paper/40">No preview available.</p>`
    return
  }

  let blob
  try {
    blob = await downloadFile(file.driveFileId)
  } catch {
    viewport.innerHTML = `<p class="text-sm text-ink/40 dark:text-paper/40">Couldn't load this file from Drive. Check your connection and reopen.</p>`
    return
  }
  blobUrl = URL.createObjectURL(blob)

  if (file.fileType?.startsWith('image/')) {
    viewport.innerHTML = `<img src="${blobUrl}" style="transform:scale(${zoom / 100})" class="max-w-full max-h-full object-contain" />`
  } else if (file.fileType === 'application/pdf') {
    viewport.innerHTML = `<iframe src="${blobUrl}#page=${page}" class="w-full h-full border-0"></iframe>`
  } else {
    viewport.innerHTML = `<div class="text-center px-6 text-ink/50 dark:text-paper/50"><p class="text-sm">Preview isn\u2019t available for this file type in-browser.</p><p class="text-xs mt-1">Use Download to open it in the right app.</p></div>`
  }
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
    const bookmarks = (await getBookmarksForFile(fileId)).sort((a, b) => a.page - b.page)
    el.innerHTML = bookmarks.length === 0 ? emptyState('bookmark', 'No bookmarks', 'Bookmark pages to find them fast later.') : `
      <ul class="flex flex-col gap-2">
        ${bookmarks.map((b) => `
          <li class="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-paper-line dark:border-ink-soft">
            <button class="jump-bookmark flex items-center gap-2 text-sm font-medium" data-page="${b.page}"><i data-lucide="bookmark" class="text-marigold-dark" style="width:13px;height:13px"></i> Page ${b.page}</button>
            <button class="delete-bookmark" data-id="${b.id}"><i data-lucide="trash-2" style="width:13px;height:13px" class="text-ink/40 dark:text-paper/40"></i></button>
          </li>`).join('')}
      </ul>`
    window.lucide?.createIcons()
    el.querySelectorAll('.jump-bookmark').forEach((btn) => btn.addEventListener('click', () => {
      page = Number(btn.dataset.page)
      updatePageUI()
    }))
    el.querySelectorAll('.delete-bookmark').forEach((btn) => btn.addEventListener('click', async () => {
      await deleteBookmark(btn.dataset.id)
      renderTabContent(fileId)
    }))
  }
}

function updatePageUI() {
  page = Math.min(Math.max(page, 1), TOTAL_PAGES)
  document.getElementById('page-indicator').textContent = `${page} / ${TOTAL_PAGES}`
  const file = state.files.find((f) => f.id === currentFileId)
  if (file) {
    file.readProgress = Math.round((page / TOTAL_PAGES) * 100)
    file.lastPage = page
    persist()
    document.querySelector('#reader-viewport')?.parentElement?.querySelector('.progress-fill')
  }
  loadViewer(file)
}

export function mount(params, routeParam) {
  const file = state.files.find((f) => f.id === routeParam)
  if (!file) return
  window.lucide?.createIcons()

  if (file.status === 'Not Started') markFileStatus(file.id, 'Reading')

  loadViewer(file)
  renderTabContent(file.id)

  document.getElementById('prev-page').addEventListener('click', () => { page--; updatePageUI() })
  document.getElementById('next-page').addEventListener('click', () => { page++; updatePageUI() })
  document.getElementById('zoom-in').addEventListener('click', () => { zoom = Math.min(zoom + 10, 200); document.getElementById('zoom-indicator').textContent = zoom + '%'; loadViewer(file) })
  document.getElementById('zoom-out').addEventListener('click', () => { zoom = Math.max(zoom - 10, 50); document.getElementById('zoom-indicator').textContent = zoom + '%'; loadViewer(file) })

  document.getElementById('bookmark-page').addEventListener('click', async () => {
    await addBookmark({ id: uid(), fileId: file.id, page, createdAt: new Date().toISOString() })
    showToast(`Bookmarked page ${page}`, 'success')
    if (tab === 'bookmarks') renderTabContent(file.id)
  })

  document.getElementById('download-file').addEventListener('click', async () => {
    if (!blobUrl) return
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = file.fileName || file.title
    a.click()
  })

  document.getElementById('mark-complete').addEventListener('click', () => {
    markFileStatus(file.id, file.status === 'Completed' ? 'Reading' : 'Completed')
    showToast(file.status === 'Completed' ? 'Marked as reading' : 'Marked as completed', 'success')
    location.hash = `#/reader/${file.id}`
    location.reload()
  })

  document.getElementById('tab-notes').addEventListener('click', () => { tab = 'notes'; refreshTabs(); renderTabContent(file.id) })
  document.getElementById('tab-bookmarks').addEventListener('click', () => { tab = 'bookmarks'; refreshTabs(); renderTabContent(file.id) })

  function refreshTabs() {
    document.getElementById('tab-notes').classList.toggle('active', tab === 'notes')
    document.getElementById('tab-bookmarks').classList.toggle('active', tab === 'bookmarks')
  }
}
