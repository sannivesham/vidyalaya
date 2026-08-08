import { state, persist } from '../store.js'
import { uid, PRIORITIES, TASK_CATEGORIES, escapeHtml } from '../utils.js'
import { emptyState } from './dashboard.js'

let filter = 'pending'
const PRIORITY_STYLE = {
  High: 'color:#B23A2E;border-color:rgba(178,58,46,0.3);background:rgba(178,58,46,0.05)',
  Medium: 'color:#B87D06;border-color:rgba(227,160,8,0.3);background:rgba(227,160,8,0.05)',
  Low: 'color:#43665A;border-color:rgba(92,131,116,0.3);background:rgba(92,131,116,0.05)',
}

export function render() {
  return `
    <div class="max-w-3xl mx-auto">
      <div class="flex items-center justify-between mb-5">
        <h1 class="font-display text-2xl font-semibold">Tasks</h1>
        <button id="open-task-form" class="btn btn-primary"><i data-lucide="plus" style="width:16px;height:16px"></i> Add Task</button>
      </div>
      <div id="task-filters" class="flex gap-2 mb-5">
        ${['pending', 'completed', 'all'].map((f) => `<button class="chip ${filter === f ? 'active' : ''}" data-filter="${f}" style="text-transform:capitalize">${f}</button>`).join('')}
      </div>
      <div id="task-list"></div>
    </div>
    <div id="task-modal-root"></div>
  `
}

function renderList() {
  const list = document.getElementById('task-list')
  if (!list) return
  let tasks = state.tasks
  if (filter === 'pending') tasks = tasks.filter((t) => !t.completed)
  if (filter === 'completed') tasks = tasks.filter((t) => t.completed)

  if (tasks.length === 0) {
    list.innerHTML = emptyState('list-todo', 'No tasks here', 'Add a task to get started.')
    window.lucide?.createIcons()
    return
  }

  list.innerHTML = `<ul class="flex flex-col gap-2">
    ${tasks.map((t) => `
      <li class="flex items-center gap-3 p-3 rounded-lg border border-paper-line dark:border-ink-soft">
        <button class="toggle-task" data-id="${t.id}">
          <i data-lucide="${t.completed ? 'check-circle-2' : 'circle'}" style="width:18px;height:18px" class="${t.completed ? 'text-sage' : 'text-ink/30 dark:text-paper/30'}"></i>
        </button>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium truncate ${t.completed ? 'line-through text-ink/40 dark:text-paper/40' : ''}">${escapeHtml(t.title)}</p>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="text-xs text-ink/50 dark:text-paper/50">${t.category}</span>
            ${t.dueDate ? `<span class="text-xs text-ink/50 dark:text-paper/50">&middot; Due ${new Date(t.dueDate).toLocaleDateString()}</span>` : ''}
          </div>
        </div>
        <span class="text-[10px] font-medium px-2 py-1 rounded-full border shrink-0" style="${PRIORITY_STYLE[t.priority]}">${t.priority}</span>
        <button class="delete-task" data-id="${t.id}"><i data-lucide="trash-2" style="width:14px;height:14px" class="text-ink/40 dark:text-paper/40"></i></button>
      </li>`).join('')}
  </ul>`
  window.lucide?.createIcons()

  list.querySelectorAll('.toggle-task').forEach((btn) => btn.addEventListener('click', () => {
    const t = state.tasks.find((x) => x.id === btn.dataset.id)
    if (t) { t.completed = !t.completed; persist(); renderList() }
  }))
  list.querySelectorAll('.delete-task').forEach((btn) => btn.addEventListener('click', () => {
    state.tasks = state.tasks.filter((x) => x.id !== btn.dataset.id)
    persist()
    renderList()
  }))
}

function renderForm(open) {
  const root = document.getElementById('task-modal-root')
  if (!root) return
  if (!open) { root.innerHTML = ''; return }

  root.innerHTML = `
    <div class="modal-backdrop" id="task-backdrop">
      <div class="modal-box">
        <div class="flex items-center justify-between px-6 py-4 border-b border-paper-line dark:border-ink-soft">
          <h3 class="font-display text-lg font-semibold">Add a task</h3>
          <button id="close-task"><i data-lucide="x" style="width:18px;height:18px"></i></button>
        </div>
        <form id="task-form" class="p-6 flex flex-col gap-4">
          <div><label class="block text-xs font-medium mb-1.5">Task</label><input id="task-title" class="input" required /></div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="block text-xs font-medium mb-1.5">Category</label>
              <select id="task-category" class="input">${TASK_CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select>
            </div>
            <div><label class="block text-xs font-medium mb-1.5">Priority</label>
              <select id="task-priority" class="input">${PRIORITIES.map((p) => `<option>${p}</option>`).join('')}</select>
            </div>
          </div>
          <div><label class="block text-xs font-medium mb-1.5">Due date</label><input type="date" id="task-due" class="input" /></div>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" id="cancel-task" class="btn btn-secondary">Cancel</button>
            <button type="submit" class="btn btn-primary">Add Task</button>
          </div>
        </form>
      </div>
    </div>
  `
  window.lucide?.createIcons()
  const close = () => renderForm(false)
  document.getElementById('close-task').addEventListener('click', close)
  document.getElementById('cancel-task').addEventListener('click', close)
  document.getElementById('task-backdrop').addEventListener('click', (e) => { if (e.target.id === 'task-backdrop') close() })

  document.getElementById('task-form').addEventListener('submit', (e) => {
    e.preventDefault()
    const title = document.getElementById('task-title').value
    if (!title) return
    state.tasks.unshift({
      id: uid(), title, completed: false, createdAt: new Date().toISOString(),
      category: document.getElementById('task-category').value,
      priority: document.getElementById('task-priority').value,
      dueDate: document.getElementById('task-due').value,
    })
    persist()
    close()
    renderList()
  })
}

export function mount() {
  window.lucide?.createIcons()
  renderList()
  renderForm(false)
  document.getElementById('open-task-form').addEventListener('click', () => renderForm(true))
  document.getElementById('task-filters').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]')
    if (!btn) return
    filter = btn.dataset.filter
    document.querySelectorAll('#task-filters .chip').forEach((c) => c.classList.toggle('active', c.dataset.filter === filter))
    renderList()
  })
}
