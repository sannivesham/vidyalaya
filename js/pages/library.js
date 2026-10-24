import { state, addFile, updateFile, removeFile, addFolder, updateFolder, deleteFolder, getFolder, saveFileBlob, persist } from '../store.js'
import { isTelegramConfigured, uploadFileToTelegram } from '../telegram-store.js'
import { CATEGORIES, FOLDER_COLORS, FOLDER_ICONS, formatFileSize, escapeHtml } from '../utils.js'
import { showToast } from '../toast.js'
import { emptyState } from './dashboard.js'

let activeTab = 'folders' // 'folders' | 'all' | 'favorites'
let currentFolderId = null // null means at library root
let searchQuery = ''
let selectedCategory = 'All'

export function render(params) {
  const folderParam = params.get('folder')
  const openUpload = params.get('upload') === '1'
  const filterParam = params.get('filter')

  if (folderParam) {
    currentFolderId = folderParam
    activeTab = 'folders'
  } else if (filterParam === 'favorites') {
    activeTab = 'favorites'
    currentFolderId = null
  } else if (params.get('tab') === 'all') {
    activeTab = 'all'
    currentFolderId = null
  } else {
    currentFolderId = null
  }

  const currentFolder = currentFolderId ? getFolder(currentFolderId) : null
  const telegramActive = isTelegramConfigured()

  return `
    <div class="max-w-6xl mx-auto">
      <!-- Top header -->
      <div class="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          ${currentFolder ? `
            <div class="flex items-center gap-2 text-xs text-ink/50 dark:text-paper/50 mb-1">
              <a href="#/library" class="hover:text-marigold-dark flex items-center gap-1 font-medium">
                <i data-lucide="library" style="width:13px;height:13px"></i> All Subjects
              </a>
              <span>/</span>
              <span class="text-ink dark:text-paper font-semibold">${escapeHtml(currentFolder.name)}</span>
            </div>
            <h1 class="font-display text-2xl font-semibold flex items-center gap-2.5">
              <span class="w-4 h-4 rounded-full inline-block shrink-0" style="background:${currentFolder.color || '#E3A008'}"></span>
              ${escapeHtml(currentFolder.name)}
              ${currentFolder.semester ? `<span class="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-paper-dim dark:bg-ink-soft text-ink/70 dark:text-paper/70">${escapeHtml(currentFolder.semester)}</span>` : ''}
            </h1>
          ` : `
            <h1 class="font-display text-2xl font-semibold">Study Library</h1>
            <p class="text-xs text-ink/50 dark:text-paper/50 mt-0.5">Organize your materials by subject, view presentations & PDFs, and focus with the 25-5 timer.</p>
          `}
        </div>

        <div class="flex items-center gap-2">
          ${!currentFolder ? `
            <button id="open-new-folder" class="btn btn-secondary">
              <i data-lucide="folder-plus" style="width:16px;height:16px"></i> New Subject
            </button>
          ` : `
            <a href="#/library" class="btn btn-secondary">
              <i data-lucide="arrow-left" style="width:15px;height:15px"></i> Back to Subjects
            </a>
          `}
          <button id="open-upload" class="btn btn-primary">
            <i data-lucide="upload" style="width:16px;height:16px"></i> Upload File
          </button>
        </div>
      </div>

      <!-- Storage status indicator pill -->
      <div class="mb-4 flex items-center justify-between gap-3 text-xs px-3.5 py-2 rounded-lg border border-paper-line dark:border-ink-soft bg-paper-dim/40 dark:bg-ink-light/40">
        <div class="flex items-center gap-2">
          <i data-lucide="${telegramActive ? 'cloud-check' : 'hard-drive'}" class="${telegramActive ? 'text-sage' : 'text-marigold-dark'}" style="width:16px;height:16px"></i>
          <span>
            ${telegramActive
              ? `<strong>Telegram Cloud Storage</strong> active — files safely backed up to your Telegram channel.`
              : `<strong>Local Storage Active</strong> — files saved in browser. <a href="#/settings" class="text-marigold-dark font-medium underline">Configure Telegram in Settings</a> to enable cloud sync.`}
          </span>
        </div>
        <a href="#/settings" class="text-[11px] font-medium text-ink/60 dark:text-paper/60 hover:text-marigold-dark shrink-0">Storage Settings &rarr;</a>
      </div>

      <!-- Search and navigation tabs -->
      <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5">
        <div class="relative flex-1">
          <i data-lucide="search" class="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40 dark:text-paper/40" style="width:16px;height:16px"></i>
          <input id="search-input" value="${escapeHtml(searchQuery)}" placeholder="Search files, subjects, tags\u2026" class="input pl-10" />
        </div>

        ${!currentFolder ? `
          <div class="flex gap-1.5 p-1 rounded-lg border border-paper-line dark:border-ink-soft bg-paper-dim/30 dark:bg-ink-light shrink-0">
            <button class="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'folders' ? 'bg-ink dark:bg-paper text-paper dark:text-ink' : 'text-ink/60 dark:text-paper/60 hover:text-ink'}" id="tab-folders">
              <i data-lucide="folder" style="width:13px;height:13px" class="inline mr-1"></i> Subjects (${(state.folders || []).length})
            </button>
            <button class="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'all' ? 'bg-ink dark:bg-paper text-paper dark:text-ink' : 'text-ink/60 dark:text-paper/60 hover:text-ink'}" id="tab-all">
              <i data-lucide="files" style="width:13px;height:13px" class="inline mr-1"></i> All Files (${state.files.length})
            </button>
            <button class="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'favorites' ? 'bg-ink dark:bg-paper text-paper dark:text-ink' : 'text-ink/60 dark:text-paper/60 hover:text-ink'}" id="tab-favorites">
              <i data-lucide="star" style="width:13px;height:13px" class="inline mr-1"></i> Favorites (${state.files.filter(f => f.favorite).length})
            </button>
          </div>
        ` : ''}
      </div>

      <!-- Main content grid -->
      <div id="library-main-content"></div>
    </div>

    <!-- Modals root -->
    <div id="folder-modal-root"></div>
    <div id="upload-modal-root"></div>
  `
}

function getFilteredFiles() {
  const q = searchQuery.toLowerCase().trim()
  return state.files.filter((f) => {
    // If inside a folder, restrict to that folder
    if (currentFolderId && f.folderId !== currentFolderId) return false

    // If favorites tab
    if (activeTab === 'favorites' && !f.favorite) return false

    // Category filter in all-files view
    if (activeTab === 'all' && selectedCategory !== 'All' && f.category !== selectedCategory) {
      return false
    }

    if (!q) return true
    return (
      (f.title || '').toLowerCase().includes(q) ||
      (f.subject || '').toLowerCase().includes(q) ||
      (f.fileName || '').toLowerCase().includes(q) ||
      (f.tags || []).some((t) => t.toLowerCase().includes(q))
    )
  })
}

function getFilteredFolders() {
  const q = searchQuery.toLowerCase().trim()
  const folders = state.folders || []
  if (!q) return folders
  return folders.filter((f) => {
    return (
      f.name.toLowerCase().includes(q) ||
      (f.semester || '').toLowerCase().includes(q) ||
      (f.description || '').toLowerCase().includes(q)
    )
  })
}

function getFileIcon(fileType = '', fileName = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase()
  const mime = fileType.toLowerCase()

  if (ext === 'pdf' || mime === 'application/pdf') return { icon: 'file-text', color: 'text-rust', badge: 'PDF' }
  if (['ppt', 'pptx'].includes(ext) || mime.includes('presentation') || mime.includes('powerpoint')) {
    return { icon: 'presentation', color: 'text-marigold-dark', badge: 'PPTX' }
  }
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext)) {
    return { icon: 'image', color: 'text-sage', badge: 'IMG' }
  }
  if (['doc', 'docx'].includes(ext) || mime.includes('word')) {
    return { icon: 'file-text', color: 'text-blue-500', badge: 'DOC' }
  }
  return { icon: 'file', color: 'text-ink/50 dark:text-paper/50', badge: ext.toUpperCase() || 'FILE' }
}

const STATUS_ICON = { 'Not Started': 'circle', Reading: 'book-open', Completed: 'check-circle-2' }
const STATUS_COLOR = { 'Not Started': 'text-ink/40 dark:text-paper/40', Reading: 'text-marigold-dark', Completed: 'text-sage' }

function renderMainContent() {
  const container = document.getElementById('library-main-content')
  if (!container) return

  // 1. Inside a single Subject Folder
  if (currentFolderId) {
    renderSingleFolderView(container)
    return
  }

  // 2. Root - Folders Tab
  if (activeTab === 'folders') {
    renderFoldersGridView(container)
    return
  }

  // 3. Root - All Files or Favorites Tab
  renderFilesGridView(container)
}

function renderFoldersGridView(container) {
  const folders = getFilteredFolders()

  if (folders.length === 0) {
    container.innerHTML = `
      <div class="card text-center py-12">
        <div class="w-16 h-16 rounded-full bg-marigold/15 flex items-center justify-center mx-auto mb-4">
          <i data-lucide="folder-plus" class="text-marigold-dark" style="width:28px;height:28px"></i>
        </div>
        <h3 class="font-display text-lg font-semibold mb-1">${searchQuery ? 'No subjects found' : 'No subjects created yet'}</h3>
        <p class="text-sm text-ink/50 dark:text-paper/50 mb-5 max-w-sm mx-auto">Create subject-wise folders to organize your study presentations, notes, and PDF books.</p>
        <button id="empty-new-folder" class="btn btn-primary"><i data-lucide="plus" style="width:16px;height:16px"></i> Create First Subject</button>
      </div>
    `
    window.lucide?.createIcons()
    document.getElementById('empty-new-folder')?.addEventListener('click', () => openFolderModal())
    return
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      ${folders.map((f) => {
        const fileCount = state.files.filter((file) => file.folderId === f.id || file.subject === f.name).length
        const color = f.color || '#E3A008'
        return `
          <div class="folder-card p-5 cursor-pointer group" data-folder-id="${f.id}">
            <!-- Top color tab -->
            <div class="absolute top-0 left-0 right-0 h-1.5" style="background:${color}"></div>

            <div class="flex items-start justify-between gap-3 mb-3 pt-1">
              <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style="background:${color}20; color:${color}">
                <i data-lucide="${f.icon || 'folder'}" style="width:24px;height:24px"></i>
              </div>
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button class="edit-folder-btn p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10" data-id="${f.id}" title="Edit Subject">
                  <i data-lucide="pencil" style="width:14px;height:14px"></i>
                </button>
                <button class="delete-folder-btn p-1.5 rounded-md hover:bg-ink/5 dark:hover:bg-paper/10 text-rust" data-id="${f.id}" title="Delete Subject">
                  <i data-lucide="trash-2" style="width:14px;height:14px"></i>
                </button>
              </div>
            </div>

            <h3 class="font-display text-base font-semibold group-hover:text-marigold-dark transition-colors line-clamp-1 mb-1">
              ${escapeHtml(f.name)}
            </h3>

            ${f.description ? `<p class="text-xs text-ink/50 dark:text-paper/50 line-clamp-2 mb-3">${escapeHtml(f.description)}</p>` : ''}

            <div class="flex items-center justify-between text-xs text-ink/50 dark:text-paper/50 mt-4 pt-3 border-t border-paper-line/50 dark:border-ink-soft/50 font-mono">
              <span class="flex items-center gap-1.5 font-medium">
                <i data-lucide="file" style="width:13px;height:13px"></i> ${fileCount} ${fileCount === 1 ? 'file' : 'files'}
              </span>
              ${f.semester ? `<span class="px-2 py-0.5 rounded bg-paper-dim dark:bg-ink-soft text-[10px]">${escapeHtml(f.semester)}</span>` : ''}
            </div>
          </div>
        `
      }).join('')}
    </div>
  `
  window.lucide?.createIcons()

  // Bind clicks
  container.querySelectorAll('.folder-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.edit-folder-btn') || e.target.closest('.delete-folder-btn')) return
      location.hash = `#/library?folder=${card.dataset.folderId}`
    })
  })

  container.querySelectorAll('.edit-folder-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const folder = getFolder(btn.dataset.id)
      if (folder) openFolderModal(folder)
    })
  })

  container.querySelectorAll('.delete-folder-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const folder = getFolder(btn.dataset.id)
      if (!folder) return
      if (confirm(`Delete subject "${folder.name}"? Files will remain in your library under "All Files".`)) {
        deleteFolder(folder.id, false)
        showToast('Subject removed', 'success')
        renderMainContent()
      }
    })
  })
}

function renderSingleFolderView(container) {
  const folder = getFolder(currentFolderId)
  if (!folder) {
    container.innerHTML = emptyState(null, 'Subject not found', 'This folder may have been deleted.')
    return
  }

  const files = getFilteredFiles()

  if (files.length === 0) {
    container.innerHTML = `
      <div class="card text-center py-12">
        <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background:${folder.color || '#E3A008'}20; color:${folder.color || '#E3A008'}">
          <i data-lucide="folder-open" style="width:30px;height:30px"></i>
        </div>
        <h3 class="font-display text-lg font-semibold mb-1">No files in ${escapeHtml(folder.name)} yet</h3>
        <p class="text-sm text-ink/50 dark:text-paper/50 mb-5 max-w-sm mx-auto">Upload your lecture slides, notes, or reference books to start studying.</p>
        <button id="upload-to-folder-btn" class="btn btn-primary"><i data-lucide="upload" style="width:16px;height:16px"></i> Upload to ${escapeHtml(folder.name)}</button>
      </div>
    `
    window.lucide?.createIcons()
    document.getElementById('upload-to-folder-btn')?.addEventListener('click', () => openUploadModal(folder.id))
    return
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      ${files.map((f) => renderFileCardHtml(f)).join('')}
    </div>
  `
  window.lucide?.createIcons()
  bindFileCardEvents(container)
}

function renderFilesGridView(container) {
  const files = getFilteredFiles()

  if (files.length === 0) {
    const isFav = activeTab === 'favorites'
    container.innerHTML = emptyState(
      'library',
      isFav ? 'No favorite files' : 'Your library is empty',
      isFav ? 'Star files to view them quickly here.' : 'Upload study files to get started.'
    )
    return
  }

  container.innerHTML = `
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      ${files.map((f) => renderFileCardHtml(f)).join('')}
    </div>
  `
  window.lucide?.createIcons()
  bindFileCardEvents(container)
}

function renderFileCardHtml(f) {
  const typeInfo = getFileIcon(f.fileType, f.fileName)
  const folder = f.folderId ? getFolder(f.folderId) : null
  const subjectName = folder ? folder.name : (f.subject || 'Unfiled')

  return `
    <div class="index-card p-4 pl-7 text-left block hover:shadow-lg transition-all flex flex-col justify-between" data-file-id="${f.id}">
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <div class="flex items-center gap-1.5">
            <span class="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-paper-dim dark:bg-ink-soft ${typeInfo.color}">
              ${typeInfo.badge}
            </span>
            ${f.telegramFileId ? `
              <span class="text-[10px] text-sage flex items-center gap-0.5" title="Backed up on Telegram Cloud">
                <i data-lucide="cloud-check" style="width:12px;height:12px"></i>
              </span>
            ` : ''}
          </div>
          <button class="fav-toggle p-1 rounded hover:bg-ink/5 dark:hover:bg-paper/10" data-id="${f.id}">
            <i data-lucide="star" style="width:16px;height:16px" class="${f.favorite ? 'fill-marigold text-marigold' : 'text-ink/25 dark:text-paper/25'}"></i>
          </button>
        </div>

        <a href="#/reader/${f.id}" class="block group mb-2">
          <p class="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-marigold-dark transition-colors">
            ${escapeHtml(f.title)}
          </p>
        </a>

        <p class="text-xs text-ink/50 dark:text-paper/50 line-clamp-1 mb-3">
          <i data-lucide="folder" style="width:11px;height:11px" class="inline mr-0.5"></i>
          ${escapeHtml(subjectName)}
        </p>
      </div>

      <div class="pt-3 border-t border-paper-line/50 dark:border-ink-soft/50 flex items-center justify-between text-xs">
        <div class="flex items-center gap-1 font-medium ${STATUS_COLOR[f.status] || 'text-ink/40'}">
          <i data-lucide="${STATUS_ICON[f.status] || 'circle'}" style="width:12px;height:12px"></i>
          <span>${f.status}</span>
        </div>

        <div class="flex items-center gap-1">
          <a href="#/reader/${f.id}" class="btn btn-primary" style="padding:0.25rem 0.6rem;font-size:0.75rem;">
            Read <i data-lucide="arrow-right" style="width:12px;height:12px"></i>
          </a>
          <button class="delete-file-btn p-1.5 rounded hover:bg-ink/5 dark:hover:bg-paper/10 text-rust" data-id="${f.id}" title="Remove file">
            <i data-lucide="trash-2" style="width:13px;height:13px"></i>
          </button>
        </div>
      </div>
    </div>
  `
}

function bindFileCardEvents(container) {
  container.querySelectorAll('.fav-toggle').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const f = state.files.find((x) => x.id === btn.dataset.id)
      if (f) {
        f.favorite = !f.favorite
        persist()
        renderMainContent()
      }
    })
  })

  container.querySelectorAll('.delete-file-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault()
      e.stopPropagation()
      const f = state.files.find((x) => x.id === btn.dataset.id)
      if (!f) return
      if (confirm(`Remove "${f.title}" from your library?`)) {
        await removeFile(f.id)
        showToast('File removed', 'success')
        renderMainContent()
      }
    })
  })
}

// ---- Subject Folder Modal ----

function openFolderModal(existingFolder = null) {
  const root = document.getElementById('folder-modal-root')
  if (!root) return

  const isEdit = !!existingFolder
  const currentColor = existingFolder?.color || FOLDER_COLORS[0]
  const currentIcon = existingFolder?.icon || 'folder'

  root.innerHTML = `
    <div class="modal-backdrop" id="folder-backdrop">
      <div class="modal-box">
        <div class="flex items-center justify-between px-6 py-4 border-b border-paper-line dark:border-ink-soft sticky top-0 bg-paper dark:bg-ink-light">
          <h3 class="font-display text-lg font-semibold">${isEdit ? 'Edit Subject Folder' : 'Create Subject Folder'}</h3>
          <button id="close-folder-modal" class="p-1 rounded hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="x" style="width:18px;height:18px"></i></button>
        </div>

        <form id="folder-form" class="p-6 flex flex-col gap-4">
          <div>
            <label class="block text-xs font-medium mb-1.5">Subject Name <span class="text-rust">*</span></label>
            <input id="fol-name" class="input" placeholder="e.g. Mathematics, Digital Signal Processing, Physics" value="${escapeHtml(existingFolder?.name || '')}" required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1.5">Semester / Level</label>
              <input id="fol-semester" class="input" placeholder="e.g. Sem 3, Year 2" value="${escapeHtml(existingFolder?.semester || '')}" />
            </div>
            <div>
              <label class="block text-xs font-medium mb-1.5">Folder Icon</label>
              <select id="fol-icon" class="input">
                ${FOLDER_ICONS.map((ic) => `<option value="${ic}" ${currentIcon === ic ? 'selected' : ''}>${ic}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium mb-1.5">Color Accent</label>
            <div class="flex gap-2 flex-wrap" id="folder-color-picker">
              ${FOLDER_COLORS.map((c) => `
                <button type="button" class="color-chip w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === c ? 'scale-110 border-ink dark:border-paper shadow-md' : 'border-transparent'}" data-color="${c}" style="background:${c}"></button>
              `).join('')}
            </div>
            <input type="hidden" id="fol-color" value="${currentColor}" />
          </div>

          <div>
            <label class="block text-xs font-medium mb-1.5">Description (optional)</label>
            <textarea id="fol-desc" rows="2" class="input resize-none" placeholder="Brief note about this subject or syllabus...">${escapeHtml(existingFolder?.description || '')}</textarea>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-paper-line dark:border-ink-soft">
            <button type="button" id="cancel-folder-btn" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Subject'}</button>
          </div>
        </form>
      </div>
    </div>
  `
  window.lucide?.createIcons()

  const close = () => { root.innerHTML = '' }
  document.getElementById('close-folder-modal')?.addEventListener('click', close)
  document.getElementById('cancel-folder-btn')?.addEventListener('click', close)
  document.getElementById('folder-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'folder-backdrop') close()
  })

  // Color picker selection
  document.querySelectorAll('#folder-color-picker .color-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#folder-color-picker .color-chip').forEach((c) => {
        c.classList.remove('scale-110', 'border-ink', 'dark:border-paper', 'shadow-md')
        c.classList.add('border-transparent')
      })
      chip.classList.add('scale-110', 'border-ink', 'dark:border-paper', 'shadow-md')
      chip.classList.remove('border-transparent')
      document.getElementById('fol-color').value = chip.dataset.color
    })
  })

  document.getElementById('folder-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const name = document.getElementById('fol-name').value.trim()
    const semester = document.getElementById('fol-semester').value.trim()
    const icon = document.getElementById('fol-icon').value
    const color = document.getElementById('fol-color').value
    const description = document.getElementById('fol-desc').value.trim()

    if (!name) {
      showToast('Subject name is required', 'error')
      return
    }

    if (isEdit) {
      updateFolder(existingFolder.id, { name, semester, icon, color, description })
      showToast(`Subject "${name}" updated`, 'success')
    } else {
      addFolder({ name, semester, icon, color, description })
      showToast(`Subject "${name}" created!`, 'success')
    }
    close()
    renderMainContent()
  })
}

// ---- Upload File Modal ----

function openUploadModal(preselectedFolderId = null) {
  const root = document.getElementById('upload-modal-root')
  if (!root) return

  const folders = state.folders || []
  const telegramReady = isTelegramConfigured()
  const targetFolderId = preselectedFolderId || currentFolderId || (folders[0]?.id || '')

  root.innerHTML = `
    <div class="modal-backdrop" id="upload-backdrop">
      <div class="modal-box">
        <div class="flex items-center justify-between px-6 py-4 border-b border-paper-line dark:border-ink-soft sticky top-0 bg-paper dark:bg-ink-light">
          <h3 class="font-display text-lg font-semibold flex items-center gap-2">
            <i data-lucide="upload-cloud" class="text-marigold-dark" style="width:20px;height:20px"></i> Upload Study Material
          </h3>
          <button id="close-upload-modal" class="p-1 rounded hover:bg-ink/5 dark:hover:bg-paper/10"><i data-lucide="x" style="width:18px;height:18px"></i></button>
        </div>

        <form id="upload-form" class="p-6 flex flex-col gap-4">
          <!-- Drop area / file picker -->
          <div>
            <label class="block text-xs font-medium mb-1.5">Select File (PDF, PPT, PPTX, Image, Doc) <span class="text-rust">*</span></label>
            <div id="drop-zone" class="border-2 border-dashed border-paper-line dark:border-ink-soft rounded-xl p-6 text-center cursor-pointer hover:border-marigold transition-colors bg-paper-dim/30 dark:bg-ink-soft/30">
              <i data-lucide="file-up" class="mx-auto text-ink/40 dark:text-paper/40 mb-2" style="width:32px;height:32px"></i>
              <p class="text-xs font-semibold mb-0.5" id="drop-text">Click to browse or drag file here</p>
              <p class="text-[11px] text-ink/40 dark:text-paper/40 font-mono">Supports .pdf, .pptx, .ppt, .docx, images</p>
              <input type="file" id="file-input" accept=".pdf,.ppt,.pptx,.doc,.docx,image/*,.txt,.md" class="hidden" required />
            </div>
            <p id="selected-filename" class="text-xs text-marigold-dark font-mono mt-1.5 hidden"></p>
          </div>

          <div>
            <label class="block text-xs font-medium mb-1.5">Document Title <span class="text-rust">*</span></label>
            <input id="up-title" class="input" placeholder="e.g. Unit 3 - Laplace Transforms" required />
          </div>

          <!-- Subject Folder Assignment -->
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium mb-1.5">Subject Folder <span class="text-rust">*</span></label>
              <select id="up-folder" class="input" required>
                ${folders.map((fol) => `
                  <option value="${fol.id}" ${fol.id === targetFolderId ? 'selected' : ''}>
                    ${escapeHtml(fol.name)} ${fol.semester ? `(${escapeHtml(fol.semester)})` : ''}
                  </option>
                `).join('')}
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1.5">Category</label>
              <select id="up-category" class="input">
                ${CATEGORIES.map((cat) => `<option value="${cat}">${cat}</option>`).join('')}
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium mb-1.5">Tags (comma separated)</label>
            <input id="up-tags" class="input" placeholder="unit-1, formulas, mid-term" />
          </div>

          <!-- Cloud status note -->
          <div class="p-3 rounded-lg border text-xs ${telegramReady ? 'border-sage/40 bg-sage/10 text-sage-dark dark:text-sage-light' : 'border-marigold/40 bg-marigold/10 text-ink/70 dark:text-paper/70'}">
            <div class="flex items-center gap-1.5 font-semibold">
              <i data-lucide="${telegramReady ? 'check-circle' : 'info'}" style="width:14px;height:14px"></i>
              <span>${telegramReady ? 'Telegram Cloud Storage Enabled' : 'Local Storage Mode'}</span>
            </div>
            <p class="text-[11px] mt-0.5 opacity-80">
              ${telegramReady
                ? 'Your file will be uploaded to your Telegram channel and cached in browser.'
                : 'File will be saved locally. You can connect your Telegram bot in Settings for cloud sync.'}
            </p>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-paper-line dark:border-ink-soft">
            <button type="button" id="cancel-upload-btn" class="btn btn-secondary">Cancel</button>
            <button type="submit" id="submit-upload-btn" class="btn btn-primary">
              <i data-lucide="upload" style="width:16px;height:16px"></i> Upload File
            </button>
          </div>
        </form>
      </div>
    </div>
  `
  window.lucide?.createIcons()

  const close = () => { root.innerHTML = '' }
  document.getElementById('close-upload-modal')?.addEventListener('click', close)
  document.getElementById('cancel-upload-btn')?.addEventListener('click', close)
  document.getElementById('upload-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'upload-backdrop') close()
  })

  const dropZone = document.getElementById('drop-zone')
  const fileInput = document.getElementById('file-input')
  const titleInput = document.getElementById('up-title')
  const filenameEl = document.getElementById('selected-filename')

  dropZone.addEventListener('click', () => fileInput.click())
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('border-marigold') })
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('border-marigold'))
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault()
    dropZone.classList.remove('border-marigold')
    if (e.dataTransfer.files.length) {
      fileInput.files = e.dataTransfer.files
      handleFileSelected(e.dataTransfer.files[0])
    }
  })

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileSelected(e.target.files[0])
  })

  function handleFileSelected(file) {
    if (!file) return
    filenameEl.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`
    filenameEl.classList.remove('hidden')
    if (!titleInput.value) {
      titleInput.value = file.name.replace(/\.[^/.]+$/, '')
    }
  }

  document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const file = fileInput.files[0]
    const title = titleInput.value.trim()
    const folderId = document.getElementById('up-folder').value
    const category = document.getElementById('up-category').value
    const tags = document.getElementById('up-tags').value.split(',').map((t) => t.trim()).filter(Boolean)

    if (!file || !title) {
      showToast('Please select a file and enter a title', 'error')
      return
    }

    const folder = getFolder(folderId)
    const subject = folder ? folder.name : ''

    const submitBtn = document.getElementById('submit-upload-btn')
    submitBtn.disabled = true
    submitBtn.innerHTML = `<span class="timer-pulse">Uploading…</span>`

    try {
      // 1. Create file record in local state
      const meta = addFile({
        title,
        folderId,
        subject,
        category,
        semester: folder?.semester || '',
        tags,
        fileType: file.type || 'application/octet-stream',
        fileName: file.name,
        fileSize: file.size,
        telegramFileId: null,
        storageStatus: 'saving',
      })

      // 2. Save file blob to IndexedDB
      await saveFileBlob(meta.id, file)

      // 3. If Telegram is configured, upload to Telegram
      if (isTelegramConfigured()) {
        try {
          const tgResult = await uploadFileToTelegram(file, file.name, `Vidyalaya: ${title} (${subject})`)
          updateFile(meta.id, {
            telegramFileId: tgResult.telegramFileId,
            telegramMessageId: tgResult.telegramMessageId,
            storageStatus: 'synced',
          })
          showToast('Uploaded to Telegram Cloud & Local Library!', 'success')
        } catch (tgErr) {
          console.warn('Telegram upload error:', tgErr)
          updateFile(meta.id, { storageStatus: 'local-only' })
          showToast(`Saved locally! (Telegram sync notice: ${tgErr.message})`, 'success')
        }
      } else {
        updateFile(meta.id, { storageStatus: 'local-only' })
        showToast('File added to your library!', 'success')
      }

      close()
      renderMainContent()
    } catch (err) {
      console.error('Upload error:', err)
      showToast('Failed to save file: ' + err.message, 'error')
      submitBtn.disabled = false
      submitBtn.innerHTML = `<i data-lucide="upload" style="width:16px;height:16px"></i> Upload File`
      window.lucide?.createIcons()
    }
  })
}

export function mount(params) {
  window.lucide?.createIcons()
  renderMainContent()

  // New folder button
  document.getElementById('open-new-folder')?.addEventListener('click', () => openFolderModal())

  // Upload button
  document.getElementById('open-upload')?.addEventListener('click', () => openUploadModal())

  // Search input
  document.getElementById('search-input')?.addEventListener('input', (e) => {
    searchQuery = e.target.value
    renderMainContent()
  })

  // Tabs
  document.getElementById('tab-folders')?.addEventListener('click', () => {
    activeTab = 'folders'
    currentFolderId = null
    location.hash = '#/library'
  })
  document.getElementById('tab-all')?.addEventListener('click', () => {
    activeTab = 'all'
    currentFolderId = null
    renderMainContent()
    updateTabButtons()
  })
  document.getElementById('tab-favorites')?.addEventListener('click', () => {
    activeTab = 'favorites'
    currentFolderId = null
    renderMainContent()
    updateTabButtons()
  })

  if (params.get('upload') === '1') {
    openUploadModal()
  }

  function updateTabButtons() {
    const fBtn = document.getElementById('tab-folders')
    const aBtn = document.getElementById('tab-all')
    const favBtn = document.getElementById('tab-favorites')
    if (fBtn) fBtn.className = `px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'folders' ? 'bg-ink dark:bg-paper text-paper dark:text-ink' : 'text-ink/60 dark:text-paper/60 hover:text-ink'}`
    if (aBtn) aBtn.className = `px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'all' ? 'bg-ink dark:bg-paper text-paper dark:text-ink' : 'text-ink/60 dark:text-paper/60 hover:text-ink'}`
    if (favBtn) favBtn.className = `px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${activeTab === 'favorites' ? 'bg-ink dark:bg-paper text-paper dark:text-ink' : 'text-ink/60 dark:text-paper/60 hover:text-ink'}`
  }
}
