import { state, BADGE_DEFS, persist } from '../store.js'
import { formatDuration, escapeHtml } from '../utils.js'
import { getTelegramUser, setTelegramUser, isTelegramLoggedIn, testTelegramConnection } from '../telegram-store.js'
import { showToast } from '../toast.js'

function renderTelegramLoginPrompt() {
  return `
    <div class="max-w-md mx-auto py-8">
      <div class="card p-6 md:p-8 text-center shadow-md">
        <!-- Telegram Logo -->
        <div class="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center mx-auto mb-4">
          <i data-lucide="send" style="width:32px;height:32px"></i>
        </div>

        <h1 class="font-display text-2xl font-semibold mb-2">Log in with Telegram</h1>
        <p class="text-xs text-ink/60 dark:text-paper/60 mb-6 leading-relaxed">
          Connect your Telegram account. Every document you upload in Vidyalaya is sent directly to your <strong>Telegram Saved Messages</strong> for free, permanent cloud storage.
        </p>

        <!-- Quick Connect Form -->
        <form id="tg-login-form" class="flex flex-col gap-3.5 text-left">
          <div>
            <label class="block text-xs font-semibold mb-1 flex items-center justify-between">
              <span>Telegram Bot Token <span class="text-rust">*</span></span>
              <a href="https://t.me/BotFather" target="_blank" rel="noopener" class="text-[11px] text-marigold-dark hover:underline flex items-center gap-1 font-normal">
                @BotFather <i data-lucide="external-link" style="width:11px;height:11px"></i>
              </a>
            </label>
            <input id="login-bot-token" type="password" class="input font-mono text-xs" placeholder="e.g. 1234567890:ABCdefGHI..." required />
            <p class="text-[10px] text-ink/40 dark:text-paper/40 mt-1">Get this once from @BotFather by sending <code>/newbot</code>.</p>
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1">
              Your Telegram Username or Chat ID <span class="text-rust">*</span>
            </label>
            <input id="login-chat-id" class="input font-mono text-xs" placeholder="e.g. @username or 123456789" required />
            <p class="text-[10px] text-ink/40 dark:text-paper/40 mt-1">Your personal Telegram username or numeric ID where files will be sent.</p>
          </div>

          <div id="login-error-msg" class="hidden p-2.5 rounded-lg text-xs bg-rust/15 text-rust border border-rust/30"></div>

          <button type="submit" id="tg-login-submit" class="btn btn-primary w-full mt-2" style="padding:0.6rem 1rem;">
            <i data-lucide="log-in" style="width:16px;height:16px"></i> Connect & Log in with Telegram
          </button>
        </form>

        <div class="mt-6 pt-5 border-t border-paper-line/50 dark:border-ink-soft/50 text-[11px] text-ink/40 dark:text-paper/40">
          <p>No channels or groups needed &bull; Files go straight to your private Telegram chat.</p>
        </div>
      </div>
    </div>
  `
}

function renderTelegramAccount(user) {
  const totalMinutes = state.studyLog.reduce((sum, l) => sum + l.minutes, 0)
  const completedCount = state.files.filter((f) => f.status === 'Completed').length
  const completionPct = state.files.length ? Math.round((completedCount / state.files.length) * 100) : 0
  const circumference = 2 * Math.PI * 33

  const displayName = user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : (state.profile.name || 'Student')
  const username = user.username ? `@${user.username}` : (user.id ? `ID: ${user.id}` : '')

  return `
    <div class="max-w-3xl mx-auto">
      <!-- Profile banner card -->
      <div class="card flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6 p-6">
        <div class="relative shrink-0">
          ${user.photo_url
            ? `<img src="${escapeHtml(user.photo_url)}" class="w-18 h-18 rounded-full border-2 border-marigold object-cover shadow" />`
            : `<div class="w-16 h-16 rounded-full bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xl">
                 <i data-lucide="send" style="width:26px;height:26px"></i>
               </div>`}
          <span class="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-sage border-2 border-paper dark:border-ink" title="Connected"></span>
        </div>

        <div class="flex-1 text-center sm:text-left">
          <div class="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
            <h1 class="font-display text-xl font-semibold">${escapeHtml(displayName)}</h1>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400">
              Telegram
            </span>
          </div>
          ${username ? `<p class="text-xs text-ink/60 dark:text-paper/60 font-mono mb-2">${escapeHtml(username)}</p>` : ''}
          <p class="text-xs text-sage font-medium flex items-center justify-center sm:justify-start gap-1">
            <i data-lucide="check-circle-2" style="width:13px;height:13px"></i>
            Saved Messages Cloud Vault Active
          </p>
        </div>

        <button id="tg-logout-btn" class="btn btn-secondary text-xs shrink-0 self-center sm:self-start">
          <i data-lucide="log-out" style="width:14px;height:14px"></i> Sign out
        </button>
      </div>

      <!-- Vault info notice -->
      <div class="p-4 rounded-xl border border-sage/40 bg-sage/10 text-xs mb-6 flex items-start gap-3">
        <i data-lucide="cloud-check" class="text-sage mt-0.5 shrink-0" style="width:18px;height:18px"></i>
        <div>
          <p class="font-semibold text-sage-dark dark:text-sage-light">Telegram Saved Messages Active</p>
          <p class="text-ink/60 dark:text-paper/60 mt-0.5 leading-relaxed">
            Every file you upload in any subject folder is instantly sent to your Telegram chat. You can access, forward, or download your materials anytime from your phone, laptop, or tablet.
          </p>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="card flex flex-col items-center text-center">
          <div class="relative w-[72px] h-[72px] flex items-center justify-center">
            <svg width="72" height="72" class="-rotate-90 absolute inset-0">
              <circle cx="36" cy="36" r="33" stroke-width="6" fill="none" class="stroke-paper-line dark:stroke-ink-soft"></circle>
              <circle cx="36" cy="36" r="33" stroke-width="6" stroke="#E3A008" fill="none" stroke-linecap="round"
                stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - completionPct / 100)}"></circle>
            </svg>
            <span class="font-mono text-sm font-semibold">${completionPct}%</span>
          </div>
          <p class="text-xs text-ink/50 dark:text-paper/50 mt-2">Overall Completion</p>
        </div>

        <div class="card flex flex-col items-center justify-center text-center">
          <p class="font-mono text-2xl font-semibold">${state.streak.current}</p>
          <p class="text-xs text-ink/50 dark:text-paper/50 mt-1">Day Streak</p>
        </div>

        <div class="card flex flex-col items-center justify-center text-center">
          <p class="font-mono text-2xl font-semibold">${formatDuration(totalMinutes)}</p>
          <p class="text-xs text-ink/50 dark:text-paper/50 mt-1">Total Study Time</p>
        </div>

        <div class="card flex flex-col items-center justify-center text-center">
          <p class="font-mono text-2xl font-semibold">${state.achievements.length}/${BADGE_DEFS.length}</p>
          <p class="text-xs text-ink/50 dark:text-paper/50 mt-1">Achievements</p>
        </div>
      </div>
    </div>
  `
}

export function render() {
  const tgUser = getTelegramUser()
  return tgUser ? renderTelegramAccount(tgUser) : renderTelegramLoginPrompt()
}

export function mount() {
  window.lucide?.createIcons()

  const tgUser = getTelegramUser()

  if (!tgUser) {
    const form = document.getElementById('tg-login-form')
    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const botToken = document.getElementById('login-bot-token').value.trim()
      const chatId = document.getElementById('login-chat-id').value.trim()
      const submitBtn = document.getElementById('tg-login-submit')
      const errorMsg = document.getElementById('login-error-msg')

      if (!botToken || !chatId) {
        showToast('Please fill in both Bot Token and Telegram Username/ID', 'error')
        return
      }

      submitBtn.disabled = true
      submitBtn.innerHTML = `<span class="animate-pulse">Connecting to Telegram…</span>`
      errorMsg.classList.add('hidden')

      try {
        const result = await testTelegramConnection(botToken, chatId)

        // Clean username
        const cleanUsername = chatId.startsWith('@') ? chatId.slice(1) : chatId
        const userObj = {
          id: chatId,
          first_name: cleanUsername,
          username: cleanUsername,
          botToken,
          connectedAt: new Date().toISOString(),
        }

        setTelegramUser(userObj)

        // Update in-memory profile
        state.profile.name = cleanUsername
        state.profile.telegramUsername = cleanUsername
        state.profile.telegramId = chatId
        persist()

        showToast(`Connected to Telegram! Uploads will go to Saved Messages.`, 'success')
        location.hash = '#/profile'
        location.reload()
      } catch (err) {
        console.error('Telegram login error:', err)
        errorMsg.textContent = err.message || 'Could not connect. Please verify your Bot Token.'
        errorMsg.classList.remove('hidden')
        showToast('Login failed: ' + err.message, 'error')
      } finally {
        submitBtn.disabled = false
        submitBtn.innerHTML = `<i data-lucide="log-in" style="width:16px;height:16px"></i> Connect & Log in with Telegram`
        window.lucide?.createIcons()
      }
    })
  } else {
    document.getElementById('tg-logout-btn')?.addEventListener('click', () => {
      if (confirm('Sign out from Telegram?')) {
        setTelegramUser(null)
        showToast('Logged out from Telegram', 'success')
        location.hash = '#/profile'
        location.reload()
      }
    })
  }
}
