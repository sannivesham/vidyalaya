import { state, persist } from '../store.js'
import { uid, WEEKDAYS, escapeHtml } from '../utils.js'
import { emptyState } from './dashboard.js'

const COLORS = ['#E3A008', '#5C8374', '#B23A2E', '#3B6EA5', '#8B5CF6']
let view = 'weekly'
let formMode = 'recurring' // 'recurring' | 'date'
let formDays = []
let formColor = COLORS[0]
let editingId = null

export function render() {
  return `
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between mb-5">
        <h1 class="font-display text-2xl font-semibold">Timetable</h1>
        <button id="open-tt-form" class="btn btn-primary"><i data-lucide="plus" style="width:16px;height:16px"></i> Add Entry</button>
      </div>
      <div id="tt-board"></div>
      <div class="mt-8">
        <h2 class="font-display text-lg font-semibold mb-3">Specific Dates</h2>
        <div id="tt-dated-list"></div>
      </div>
    </div>
    <div id="tt-modal-root"></div>
  `
}

function renderBoard() {
  const board = document.getElementById('tt-board')
  if (!board) return
  const entries = state.timetable.filter((e) => e.days)

  if (entries.length === 0) {
    board.innerHTML = emptyState('calendar-clock', 'No recurring slots yet', 'Add a weekly study slot to build your rhythm.')
    window.lucide?.createIcons()
  } else {
    const today = new Date().getDay()
    const visible = view === 'daily' ? entries.filter((e) => e.days.includes(today)) : entries
    const sorted = [...visible].sort((a, b) => a.time.localeCompare(b.time))

    board.innerHTML = `
      <div class="flex gap-2 mb-4">
        ${['daily', 'weekly'].map((v) => `<button class="chip ${view === v ? 'active' : ''}" data-view="${v}" style="text-transform:capitalize">${v}</button>`).join('')}
      </div>
      <div class="border border-paper-line dark:border-ink-soft rounded-xl overflow-hidden overflow-x-auto">
        <div class="grid grid-cols-[80px_repeat(7,1fr)] bg-paper-dim/60 dark:bg-ink-soft/40 text-[10px] font-mono uppercase min-w-[600px]">
          <div class="p-2"></div>
          ${WEEKDAYS.map((d) => `<div class="p-2 text-center border-l border-paper-line dark:border-ink-soft">${d}</div>`).join('')}
        </div>
        ${sorted.map((entry) => `
          <div class="grid grid-cols-[80px_repeat(7,1fr)] border-t border-paper-line dark:border-ink-soft min-w-[600px]">
            <div class="p-2 text-[11px] font-mono flex items-center gap-1"><span class="punch-hole"></span>${entry.time}</div>
            ${WEEKDAYS.map((_, idx) => `
              <div class="p-1.5 border-l border-paper-line dark:border-ink-soft flex items-center justify-center">
                ${entry.days.includes(idx) ? `
                  <div class="w-full text-center text-[10px] font-medium rounded px-1 py-1.5 flex items-center justify-between gap-1" style="background:${entry.color}22;color:${entry.color}">
                    <span class="truncate">${escapeHtml(entry.subject)}</span>
                    <span class="flex items-center gap-0.5 shrink-0">
                      <button class="edit-entry" data-id="${entry.id}"><i data-lucide="pencil" style="width:10px;height:10px"></i></button>
                      <button class="delete-entry" data-id="${entry.id}"><i data-lucide="trash-2" style="width:10px;height:10px"></i></button>
                    </span>
                  </div>` : ''}
              </div>`).join('')}
          </div>`).join('')}
      </div>
    `
    window.lucide?.createIcons()
    board.querySelectorAll('[data-view]').forEach((btn) => btn.addEventListener('click', () => { view = btn.dataset.view; renderBoard() }))
    board.querySelectorAll('.edit-entry').forEach((btn) => btn.addEventListener('click', () => openEdit(btn.dataset.id)))
    board.querySelectorAll('.delete-entry').forEach((btn) => btn.addEventListener('click', () => removeEntry(btn.dataset.id)))
  }

  renderDatedList()
}

function renderDatedList() {
  const list = document.getElementById('tt-dated-list')
  if (!list) return
  const dated = state.timetable.filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  if (dated.length === 0) {
    list.innerHTML = emptyState('calendar-days', 'No date-specific entries', 'Add an entry tied to a single date instead of a weekly repeat.')
    window.lucide?.createIcons()
    return
  }

  list.innerHTML = `
    <ul class="flex flex-col gap-2">
      ${dated.map((entry) => `
        <li class="flex items-center gap-3 p-3 rounded-lg border border-paper-line dark:border-ink-soft">
          <div class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${entry.color}"></div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate">${escapeHtml(entry.subject)}</p>
            <p class="text-xs text-ink/50 dark:text-paper/50">${new Date(entry.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} &middot; ${entry.time} &middot; ${entry.duration} min</p>
          </div>
          <button class="edit-entry" data-id="${entry.id}"><i data-lucide="pencil" style="width:14px;height:14px" class="text-ink/40 dark:text-paper/40"></i></button>
          <button class="delete-entry" data-id="${entry.id}"><i data-lucide="trash-2" style="width:14px;height:14px" class="text-ink/40 dark:text-paper/40"></i></button>
        </li>`).join('')}
    </ul>
  `
  window.lucide?.createIcons()
  list.querySelectorAll('.edit-entry').forEach((btn) => btn.addEventListener('click', () => openEdit(btn.dataset.id)))
  list.querySelectorAll('.delete-entry').forEach((btn) => btn.addEventListener('click', () => removeEntry(btn.dataset.id)))
}

function removeEntry(id) {
  state.timetable = state.timetable.filter((e) => e.id !== id)
  persist()
  renderBoard()
}

function openEdit(id) {
  const entry = state.timetable.find((e) => e.id === id)
  if (!entry) return
  renderForm(true, entry)
}

function renderForm(open, entryToEdit = null) {
  const root = document.getElementById('tt-modal-root')
  if (!root) return
  if (!open) { root.innerHTML = ''; editingId = null; return }

  editingId = entryToEdit?.id || null
  formMode = entryToEdit?.date ? 'date' : 'recurring'
  formDays = entryToEdit?.days ? [...entryToEdit.days] : []
  formColor = entryToEdit?.color || COLORS[0]

  root.innerHTML = `
    <div class="modal-backdrop" id="tt-backdrop">
      <div class="modal-box">
        <div class="flex items-center justify-between px-6 py-4 border-b border-paper-line dark:border-ink-soft">
          <h3 class="font-display text-lg font-semibold">${editingId ? 'Edit entry' : 'New timetable entry'}</h3>
          <button id="close-tt"><i data-lucide="x" style="width:18px;height:18px"></i></button>
        </div>
        <form id="tt-form" class="p-6 flex flex-col gap-4">
          <div>
            <label class="block text-xs font-medium mb-1.5">Subject</label>
            <input id="tt-subject" class="input" required value="${entryToEdit ? escapeHtml(entryToEdit.subject) : ''}" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-xs font-medium mb-1.5">Time</label><input type="time" id="tt-time" value="${entryToEdit?.time || '09:00'}" class="input" /></div>
            <div><label class="block text-xs font-medium mb-1.5">Duration (min)</label><input type="number" id="tt-duration" value="${entryToEdit?.duration || 60}" min="15" step="15" class="input" /></div>
          </div>
          <div>
            <label class="block text-xs font-medium mb-1.5">Repeat type</label>
            <div class="flex gap-2">
              <button type="button" class="chip ${formMode === 'recurring' ? 'active' : ''}" data-mode="recurring">Repeats weekly</button>
              <button type="button" class="chip ${formMode === 'date' ? 'active' : ''}" data-mode="date">Specific date</button>
            </div>
          </div>
          <div id="tt-recurring-field" class="${formMode === 'recurring' ? '' : 'hidden'}">
            <label class="block text-xs font-medium mb-1.5">Repeat on</label>
            <div id="tt-days" class="flex gap-1.5">
              ${WEEKDAYS.map((d, idx) => `<button type="button" class="w-9 h-9 rounded-full text-xs font-medium border border-paper-line dark:border-ink-soft ${formDays.includes(idx) ? 'bg-ink dark:bg-paper text-paper dark:text-ink' : ''}" data-day="${idx}">${d[0]}</button>`).join('')}
            </div>
          </div>
          <div id="tt-date-field" class="${formMode === 'date' ? '' : 'hidden'}">
            <label class="block text-xs font-medium mb-1.5">Date</label>
            <input type="date" id="tt-date" value="${entryToEdit?.date || ''}" class="input" />
          </div>
          <div>
            <label class="block text-xs font-medium mb-1.5">Color</label>
            <div id="tt-colors" class="flex gap-2">
              ${COLORS.map((c) => `<button type="button" class="w-7 h-7 rounded-full border-2" data-color="${c}" style="background:${c};border-color:${formColor === c ? 'currentColor' : 'transparent'}"></button>`).join('')}
            </div>
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-tt" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">${editingId ? 'Save Changes' : 'Add to Timetable'}</button>
          </div>
        </form>
      </div>
    </div>
  `
  window.lucide?.createIcons()

  const close = () => renderForm(false)
  document.getElementById('close-tt').addEventListener('click', close)
  document.getElementById('cancel-tt').addEventListener('click', close)
  document.getElementById('tt-backdrop').addEventListener('click', (e) => { if (e.target.id === 'tt-backdrop') close() })

  document.querySelectorAll('[data-mode]').forEach((btn) => btn.addEventListener('click', () => {
    formMode = btn.dataset.mode
    document.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('active', b.dataset.mode === formMode))
    document.getElementById('tt-recurring-field').classList.toggle('hidden', formMode !== 'recurring')
    document.getElementById('tt-date-field').classList.toggle('hidden', formMode !== 'date')
  }))

  document.getElementById('tt-days').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-day]')
    if (!btn) return
    const d = Number(btn.dataset.day)
    formDays = formDays.includes(d) ? formDays.filter((x) => x !== d) : [...formDays, d]
    btn.classList.toggle('bg-ink'); btn.classList.toggle('dark:bg-paper')
    btn.classList.toggle('text-paper'); btn.classList.toggle('dark:text-ink')
  })

  document.getElementById('tt-colors').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-color]')
    if (!btn) return
    formColor = btn.dataset.color
    document.querySelectorAll('#tt-colors button').forEach((b) => b.style.borderColor = 'transparent')
    btn.style.borderColor = 'currentColor'
  })

  document.getElementById('tt-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const subject = document.getElementById('tt-subject').value
    if (!subject) return

    if (formMode === 'recurring' && formDays.length === 0) return
    if (formMode === 'date' && !document.getElementById('tt-date').value) return

    const base = {
      subject,
      time: document.getElementById('tt-time').value,
      duration: Number(document.getElementById('tt-duration').value),
      color: formColor,
    }
    const payload = formMode === 'recurring'
      ? { ...base, days: formDays, date: undefined }
      : { ...base, date: document.getElementById('tt-date').value, days: undefined }

    if (editingId) {
      const idx = state.timetable.findIndex((x) => x.id === editingId)
      if (idx !== -1) state.timetable[idx] = { ...state.timetable[idx], ...payload }
    } else {
      state.timetable.push({ id: uid(), ...payload })
    }

    persist()
    close()
    renderBoard()
  })
}

export function mount() {
  window.lucide?.createIcons()
  renderBoard()
  renderForm(false)
  document.getElementById('open-tt-form').addEventListener('click', () => renderForm(true))
}
