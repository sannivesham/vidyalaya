import { state, persist } from '../store.js'
import { getTelegramConfig, saveTelegramConfig, testTelegramConnection, isTelegramConfigured } from '../telegram-store.js'
import { showToast } from '../toast.js'
import { escapeHtml } from '../utils.js'

const ACCENTS = { marigold: '#E3A008', sage: '#5C8374', rust: '#B23A2E' }

export function render() {
  const theme = localStorage.getItem('vidyalaya-theme') || 'light'
  const accent = localStorage.getItem('vidyalaya-accent') || 'marigold'
  const tgConfig = getTelegramConfig()
  const tgActive = isTelegramConfigured()

  return `
    <div class="max-w-xl mx-auto flex flex-col gap-6">
      <div>
        <h1 class="font-display text-2xl font-semibold">Settings</h1>
        <p class="text-xs text-ink/50 dark:text-paper/50 mt-1">Configure your cloud storage, study profile, and display preferences.</p>
      </div>

      <!-- Telegram Cloud Storage Settings Card -->
      <div class="card border-2 ${tgActive ? 'border-sage/40' : 'border-paper-line dark:border-ink-soft'}">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-2.5">
            <div class="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center shrink-0">
              <i data-lucide="send" style="width:20px;height:20px"></i>
            </div>
            <div>
              <h3 class="font-display text-base font-semibold">Telegram Saved Messages Storage</h3>
              <p class="text-[11px] text-ink/50 dark:text-paper/50">Direct upload to your Telegram chat — no channels needed</p>
            </div>
          </div>
          <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${tgActive ? 'bg-sage/20 text-sage-dark dark:text-sage-light' : 'bg-paper-dim dark:bg-ink-soft text-ink/50 dark:text-paper/50'}">
            ${tgActive ? 'Active' : 'Not Connected'}
          </span>
        </div>

        <form id="telegram-form" class="flex flex-col gap-4">
          <div>
            <label class="block text-xs font-medium mb-1.5 flex items-center justify-between">
              <span>Bot Token <span class="text-rust">*</span></span>
              <a href="https://t.me/BotFather" target="_blank" rel="noopener" class="text-[11px] text-marigold-dark hover:underline flex items-center gap-1">
                @BotFather <i data-lucide="external-link" style="width:11px;height:11px"></i>
              </a>
            </label>
            <input id="tg-token" type="password" class="input font-mono text-xs" placeholder="e.g. 1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ" value="${escapeHtml(tgConfig.botToken || '')}" required />
            <p class="text-[11px] text-ink/40 dark:text-paper/40 mt-1">From @BotFather on Telegram (send <code>/newbot</code>).</p>
          </div>

          <div>
            <label class="block text-xs font-medium mb-1.5 flex items-center justify-between">
              <span>Your Telegram Username or Chat ID <span class="text-rust">*</span></span>
              <span class="text-[11px] text-ink/40 dark:text-paper/40">e.g. @username or 123456789</span>
            </label>
            <input id="tg-chat" class="input font-mono text-xs" placeholder="e.g. @username or 123456789" value="${escapeHtml(tgConfig.chatId || '')}" required />
            <p class="text-[11px] text-ink/40 dark:text-paper/40 mt-1">Uploaded documents go directly to this Telegram chat (your Saved Messages / private bot chat).</p>
          </div>

          <!-- Connection test feedback -->
          <div id="tg-test-result" class="hidden p-3 rounded-lg text-xs"></div>

          <div class="flex items-center gap-2 pt-1">
            <button type="submit" class="btn btn-primary text-xs">
              <i data-lucide="save" style="width:14px;height:14px"></i> Save Telegram Settings
            </button>
            <button type="button" id="test-tg-btn" class="btn btn-secondary text-xs">
              <i data-lucide="plug-zap" style="width:14px;height:14px"></i> Test Connection
            </button>
            <a href="#/profile" class="btn btn-secondary text-xs ml-auto">
              Go to Profile <i data-lucide="arrow-right" style="width:13px;height:13px"></i>
            </a>
          </div>
        </form>
      </div>
            <button type="button" id="test-tg-btn" class="btn btn-secondary text-xs">
              <i data-lucide="plug-zap" style="width:14px;height:14px"></i> Test Connection
            </button>
          </div>
        </form>
      </div>

      <!-- Profile -->
      <div class="card">
        <h3 class="font-display text-base font-semibold mb-4">Profile</h3>
        <form id="profile-form" class="flex flex-col gap-4">
          <div><label class="block text-xs font-medium mb-1.5">Name</label><input id="p-name" class="input" value="${escapeHtml(state.profile.name)}" /></div>
          <div><label class="block text-xs font-medium mb-1.5">Email</label><input id="p-email" type="email" class="input" value="${escapeHtml(state.profile.email)}" /></div>
          <button type="submit" class="btn btn-primary self-start">Save Profile</button>
        </form>
      </div>

      <!-- Theme & Appearance -->
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

      <!-- Data Export & Reset -->
      <div class="card">
        <h3 class="font-display text-base font-semibold mb-4">Data Management</h3>
        <p class="text-xs text-ink/50 dark:text-paper/50 mb-4">Export all your subjects, notes, and progress as a backup JSON file.</p>
        <div class="flex flex-col gap-3 items-start">
          <button id="export-data" class="btn btn-secondary"><i data-lucide="download" style="width:16px;height:16px"></i> Export JSON Backup</button>
          <button id="clear-data" class="btn btn-danger mt-2"><i data-lucide="trash-2" style="width:16px;height:16px"></i> Clear Local Cache</button>
        </div>
      </div>
    </div>
  `
}

export function mount() {
  window.lucide?.createIcons()

  // Telegram settings save
  document.getElementById('telegram-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    const botToken = document.getElementById('tg-token').value.trim()
    const chatId = document.getElementById('tg-chat').value.trim()

    saveTelegramConfig({ botToken, chatId, enabled: true })
    showToast('Telegram storage settings saved!', 'success')
  })

  // Test connection button
  document.getElementById('test-tg-btn')?.addEventListener('click', async () => {
    const botToken = document.getElementById('tg-token').value.trim()
    const chatId = document.getElementById('tg-chat').value.trim()
    const resultEl = document.getElementById('tg-test-result')
    const testBtn = document.getElementById('test-tg-btn')

    if (!botToken) {
      showToast('Please enter a Bot Token first', 'error')
      return
    }

    testBtn.disabled = true
    testBtn.innerHTML = `<span class="animate-pulse">Testing…</span>`
    resultEl.classList.add('hidden')

    try {
      const res = await testTelegramConnection(botToken, chatId)
      saveTelegramConfig({ botToken, chatId, enabled: true })

      resultEl.className = 'p-3 rounded-lg text-xs bg-sage/15 text-sage-dark dark:text-sage-light border border-sage/30 flex items-center gap-2'
      resultEl.innerHTML = `
        <i data-lucide="check-circle" style="width:16px;height:16px"></i>
        <div>
          <strong>Connected!</strong> Bot: <code>@${res.bot.username}</code> (${res.bot.first_name})
          ${res.chat ? ` &bull; Chat: <strong>${escapeHtml(res.chat.title || res.chat.username || chatId)}</strong>` : ''}
        </div>
      `
      resultEl.classList.remove('hidden')
      window.lucide?.createIcons()
      showToast('Telegram bot connection successful! 🎉', 'success')
    } catch (err) {
      resultEl.className = 'p-3 rounded-lg text-xs bg-rust/15 text-rust border border-rust/30 flex items-center gap-2'
      resultEl.innerHTML = `
        <i data-lucide="alert-circle" style="width:16px;height:16px"></i>
        <div><strong>Connection failed:</strong> ${escapeHtml(err.message)}</div>
      `
      resultEl.classList.remove('hidden')
      window.lucide?.createIcons()
      showToast('Connection failed: ' + err.message, 'error')
    } finally {
      testBtn.disabled = false
      testBtn.innerHTML = `<i data-lucide="plug-zap" style="width:14px;height:14px"></i> Test Connection`
      window.lucide?.createIcons()
    }
  })

  // Profile save
  document.getElementById('profile-form')?.addEventListener('submit', (e) => {
    e.preventDefault()
    state.profile.name = document.getElementById('p-name').value
    state.profile.email = document.getElementById('p-email').value
    persist()
    showToast('Profile updated', 'success')
  })

  // Themes
  document.getElementById('theme-light')?.addEventListener('click', () => setTheme('light'))
  document.getElementById('theme-dark')?.addEventListener('click', () => setTheme('dark'))

  document.querySelectorAll('.accent-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem('vidyalaya-accent', btn.dataset.accent)
      document.querySelectorAll('.accent-btn').forEach((b) => b.style.borderColor = 'transparent')
      btn.style.borderColor = 'currentColor'
    })
  })

  // Data Export
  document.getElementById('export-data')?.addEventListener('click', () => {
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

  // Clear data
  document.getElementById('clear-data')?.addEventListener('click', () => {
    if (!confirm('This clears locally stored cache. Continue?')) return
    localStorage.clear()
    showToast('Local cache cleared — reload to see changes', 'success')
  })
}

function setTheme(theme) {
  localStorage.setItem('vidyalaya-theme', theme)
  document.documentElement.classList.toggle('dark', theme === 'dark')
  location.reload()
}
