import { state, persist } from '../store.js'
import { showToast } from '../toast.js'
import { escapeHtml } from '../utils.js'

const ACCENTS = { marigold: '#E3A008', sage: '#5C8374', rust: '#B23A2E' }

export function render() {
  const theme = localStorage.getItem('vidyalaya-theme') || 'light'
  const accent = localStorage.getItem('vidyalaya-accent') || 'marigold'

  return `
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <h1 class="font-display text-2xl font-semibold">Settings</h1>

      <div class="card">
        <h3 class="font-display text-base font-semibold mb-4">Profile</h3>
        <form id="profile-form" class="flex flex-col gap-4">
          <div><label class="block text-xs font-medium mb-1.5">Name</label><input id="p-name" class="input" value="${escapeHtml(state.profile.name)}" /></div>
          <div><label class="block text-xs font-medium mb-1.5">Email</label><input id="p-email" type="email" class="input" value="${escapeHtml(state.profile.email)}" /></div>
          <button type="submit" class="btn btn-primary self-start">Save Profile</button>
        </form>
      </div>

      <div class="card">
        <h3 class="font-display text-base font-semibold mb-4">Theme</h3>
        <p class="text-xs font-medium mb-2">Appearance</p>
        <div class="flex gap-3 mb-6">
          <button class="px-4 py-2 rounded-lg border text-sm font-medium" id="theme-light" style="text-transform:capitalize;${theme === 'light' ? 'border-color:#E3A008;background:rgba(227,160,8,0.1)' : ''}">Light</button>
          <button class="px-4 py-2 rounded-lg border text-sm font-medium" id="theme-dark" style="text-transform:capitalize;${theme === 'dark' ? 'border-color:#E3A008;background:rgba(227,160,8,0.1)' : ''}">Dark</button>
        </div>
        <p class="text-xs font-medium mb-2">Accent color</p>
        <div class="flex gap-3">
          ${Object.entries(ACCENTS).map(([key, color]) => `
            <button class="accent-btn w-9 h-9 rounded-full border-2" data-accent="${key}" style="background:${color};border-color:${accent === key ? 'currentColor' : 'transparent'}"></button>
          `).join('')}
        </div>
      </div>

      <div class="card">
        <h3 class="font-display text-base font-semibold mb-4">Data</h3>
        <div class="flex flex-col gap-3 items-start">
          <button id="export-data" class="btn btn-secondary"><i data-lucide="download" style="width:16px;height:16px"></i> Export Data</button>
          <button id="clear-data" class="btn btn-danger mt-2"><i data-lucide="trash-2" style="width:16px;height:16px"></i> Clear All Local Data</button>
        </div>
      </div>
    </div>
  `
}

export function mount() {
  window.lucide?.createIcons()

  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault()
    state.profile.name = document.getElementById('p-name').value
    state.profile.email = document.getElementById('p-email').value
    persist()
    showToast('Profile updated', 'success')
  })

  document.getElementById('theme-light').addEventListener('click', () => setTheme('light'))
  document.getElementById('theme-dark').addEventListener('click', () => setTheme('dark'))

  document.querySelectorAll('.accent-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem('vidyalaya-accent', btn.dataset.accent)
      document.querySelectorAll('.accent-btn').forEach((b) => b.style.borderColor = 'transparent')
      btn.style.borderColor = 'currentColor'
    })
  })

  document.getElementById('export-data').addEventListener('click', () => {
    const data = { ...state, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vidyalaya-backup.json'
    a.click()
    URL.revokeObjectURL(url)
    showToast('Backup downloaded', 'success')
  })

  document.getElementById('clear-data').addEventListener('click', () => {
    if (!confirm('This clears all locally stored data. Continue?')) return
    localStorage.clear()
    showToast('Local data cleared — reload to see changes', 'success')
  })
}

function setTheme(theme) {
  localStorage.setItem('vidyalaya-theme', theme)
  document.documentElement.classList.toggle('dark', theme === 'dark')
  location.reload()
}
