import { state, addFile, saveFileBlob, persist } from '../store.js'
import { CATEGORIES, escapeHtml } from '../utils.js'
import { showToast } from '../toast.js'
import { emptyState } from './dashboard.js'

let category = 'All'
let query = ''

export function render(params) {
  if (params.get('filter') === 'favorites') category = 'Favorites'
  const openUpload = params.get('upload') === '1'

  return `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-5">
        <h1 class="font-display text-2xl font-semibold">Study Library</h1>
        <button id="open-upload" class="btn btn-primary"><i data-lucide="upload" style="width:16px;height:16px"></i> Upload File</button>
      </div>

      <div class="relative mb-5">
        <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 dark:text-paper/40" style="width:16px;height:16px"></i>
        <input id="search-input" value="${escapeHtml(query)}" placeholder="Search by title, subject, tag\u2026" class="input pl-10" />
      </div>

      <div id="category-filter" class="flex gap-2 overflow-x-auto pb-1 mb-5 -mx-1 px-1">
        ${['All', ...CATEGORIES, 'Favorites'].map((c) => `<button class="chip ${category === c ? 'active' : ''}" data-cat="${c}">${c}</button>`).join('')}
      </div>

      <div id="library-grid"></div>
    </div>

    <div id="upload-modal-root"></div>
  `
}

function filteredFiles() {
  return state.files.filter((f) => {
    const matchesCategory = category === 'All' || (category === 'Favorites' ? f.favorite : f.category === category)
    const q = query.toLowerCase()
    const matchesQuery = !q || f.title.toLowerCase().includes(q) || (f.subject || '').toLowerCase().includes(q) || (f.tags || []).some((t) => t.toLowerCase().includes(q))
    return matchesCategory && matchesQuery
  })
}

const STATUS_ICON = { 'Not Started': 'circle', Reading: 'book-open', Completed: 'check-circle-2' }
const STATUS_COLOR = { 'Not Started': 'text-ink/40 dark:text-paper/40', Reading: 'text-marigold-dark', Completed: 'text-sage' }

function renderGrid() {
  const files = filteredFiles()
  const grid = document.getElementById('library-grid')
  if (!grid) return

  if (files.length === 0) {
    grid.innerHTML = emptyState('library', 'Your library is empty', 'Upload your first study material to get started.')
  } else {
    grid.innerHTML = `<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      ${files.map((f) => `
        <a href="#/reader/${f.id}" class="index-card p-4 pl-8 text-left block hover:shadow-lg transition-shadow">
          <div class="flex items-start justify-between gap-2 mb-2">
            <i data-lucide="file-text" class="text-ink/40 dark:text-paper/40" style="width:18px;height:18px"></i>
            <button class="fav-toggle" data-id="${f.id}"><i data-lucide="star" style="width:16px;height:16px" class="${f.favorite ? 'fill-marigold text-marigold' : 'text-ink/25 dark:text-paper/25'}"></i></button>
          </div>
          <p class="text-sm font-semibold leading-snug mb-1 line-clamp-2">${escapeHtml(f.title)}</p>
          <p class="text-xs text-ink/50 dark:text-paper/50 mb-3">${escapeHtml(f.category)}${f.subject ? ' &middot; ' + escapeHtml(f.subject) : ''}</p>
          <div class="flex items-center gap-1.5 text-xs font-medium ${STATUS_COLOR[f.status]}">
            <i data-lucide="${STATUS_ICON[f.status]}" style="width:13px;height:13px"></i> ${f.status}
          </div>
        </a>`).join('')}
    </div>`
  }
  window.lucide?.createIcons()

  grid.querySelectorAll('.fav-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const f = state.files.find((x) => x.id === btn.dataset.id)
      if (f) { f.favorite = !f.favorite; persist(); renderGrid() }
    })
  })
}

function renderUploadModal(open) {
  const root = document.getElementById('upload-modal-root')
  if (!root) return
  if (!open) { root.innerHTML = ''; return }

  root.innerHTML = `
    <div class="modal-backdrop" id="upload-backdrop">
      <div class="modal-box" id="upload-box">
        <div class="flex items-center justify-between px-6 py-4 border-b border-paper-line dark:border-ink-soft sticky top-0 bg-paper dark:bg-ink-light">
          <h3 class="font-display text-lg font-semibold">Upload a file</h3>
          <button id="close-upload"><i data-lucide="x" style="width:18px;height:18px"></i></button>
        </div>
        <form id="upload-form" class="p-6 flex flex-col gap-4">
          <div>
            <label class="block text-xs font-medium mb-1.5">File (PDF, PPT, PPTX, DOCX, Image)</label>
            <input type="file" id="file-input" accept=".pdf,.ppt,.pptx,.doc,.docx,image/*" class="text-sm w-full" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1.5">Title</label>
            <input id="f-title" class="input" required />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1.5">Category</label>
              <select id="f-category" class="input">${CATEGORIES.map((c) => `<option value="${c}">${c}</option>`).join('')}</select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1.5">Semester</label>
              <input id="f-semester" class="input" placeholder="e.g. Sem 5" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium mb-1.5">Subject</label>
            <input id="f-subject" class="input" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1.5">Tags (comma separated)</label>
            <input id="f-tags" class="input" placeholder="laplace, unit-2, important" />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-upload" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Upload</button>
          </div>
        </form>
      </div>
    </div>
  `
  window.lucide?.createIcons()

  const close = () => renderUploadModal(false)
  document.getElementById('close-upload').addEventListener('click', close)
  document.getElementById('cancel-upload').addEventListener('click', close)
  document.getElementById('upload-backdrop').addEventListener('click', (e) => { if (e.target.id === 'upload-backdrop') close() })

  document.getElementById('file-input').addEventListener('change', (e) => {
    const file = e.target.files[0]
    if (file && !document.getElementById('f-title').value) {
      document.getElementById('f-title').value = file.name.replace(/\.[^/.]+$/, '')
    }
  })

  document.getElementById('upload-form').addEventListener('submit', async (e) => {
    e.preventDefault()
    const fileInput = document.getElementById('file-input')
    const selected = fileInput.files[0]
    const title = document.getElementById('f-title').value
    if (!selected || !title) { showToast('Please choose a file and give it a title', 'error'); return }

    const meta = addFile({
      title,
      category: document.getElementById('f-category').value,
      subject: document.getElementById('f-subject').value,
      semester: document.getElementById('f-semester').value,
      tags: document.getElementById('f-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
      fileType: selected.type,
      fileName: selected.name,
    })
    await saveFileBlob(meta.id, selected)
    showToast('File uploaded to your library', 'success')
    close()
    renderGrid()
  })
}

export function mount(params) {
  window.lucide?.createIcons()
  renderGrid()
  renderUploadModal(params.get('upload') === '1')

  document.getElementById('open-upload').addEventListener('click', () => renderUploadModal(true))
  document.getElementById('search-input').addEventListener('input', (e) => { query = e.target.value; renderGrid() })
  document.getElementById('category-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-cat]')
    if (!btn) return
    category = btn.dataset.cat
    document.querySelectorAll('#category-filter .chip').forEach((c) => c.classList.toggle('active', c.dataset.cat === category))
    renderGrid()
  })
}
