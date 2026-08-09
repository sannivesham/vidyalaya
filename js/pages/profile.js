import { state, BADGE_DEFS } from '../store.js'
import { formatDuration, escapeHtml } from '../utils.js'
import { getCurrentUser, signInWithGoogle, signOutUser } from '../auth.js'
import { showToast } from '../toast.js'

function renderGuestPrompt() {
  return `
    <div class="max-w-md mx-auto text-center py-10">
      <div class="w-14 h-14 rounded-full bg-marigold/20 flex items-center justify-center mx-auto mb-4">
        <i data-lucide="user" class="text-marigold-dark" style="width:24px;height:24px"></i>
      </div>
      <h1 class="font-display text-xl font-semibold mb-2">You're browsing as a guest</h1>
      <p class="text-sm text-ink/60 dark:text-paper/60 mb-6">Your data is only on this device right now. Sign in with Google to sync your library, tasks, and progress everywhere.</p>
      <button id="profile-signin" class="btn btn-primary mx-auto"><i data-lucide="log-in" style="width:16px;height:16px"></i> Sign in with Google</button>
      <p id="profile-signin-error" class="text-xs text-rust mt-3 hidden"></p>
    </div>
  `
}

function renderAccount() {
  const totalMinutes = state.studyLog.reduce((sum, l) => sum + l.minutes, 0)
  const completedCount = state.files.filter((f) => f.status === 'Completed').length
  const completionPct = state.files.length ? Math.round((completedCount / state.files.length) * 100) : 0
  const circumference = 2 * Math.PI * 33

  return `
    <div class="max-w-3xl mx-auto">
      <div class="card flex items-center gap-5 mb-6">
        ${state.profile.photoURL
          ? `<img src="${escapeHtml(state.profile.photoURL)}" class="w-16 h-16 rounded-full shrink-0" referrerpolicy="no-referrer" />`
          : `<div class="w-16 h-16 rounded-full bg-marigold/20 flex items-center justify-center shrink-0">
               <i data-lucide="user" class="text-marigold-dark" style="width:26px;height:26px"></i>
             </div>`}
        <div class="flex-1">
          <h1 class="font-display text-xl font-semibold">${escapeHtml(state.profile.name)}</h1>
          ${state.profile.email ? `<p class="text-sm text-ink/50 dark:text-paper/50">${escapeHtml(state.profile.email)}</p>` : ''}
          <p class="text-xs text-ink/40 dark:text-paper/40 mt-1 font-mono">Joined ${new Date(state.profile.joined).toLocaleDateString()}</p>
        </div>
        <button id="sign-out" class="btn btn-secondary shrink-0"><i data-lucide="log-out" style="width:14px;height:14px"></i> Sign out</button>
      </div>
      <p class="text-xs text-ink/40 dark:text-paper/40 -mt-4 mb-6 flex items-center gap-1.5">
        <i data-lucide="cloud" style="width:12px;height:12px"></i> Synced to this Google account — your library and progress will follow you on any device.
      </p>

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
  return getCurrentUser() ? renderAccount() : renderGuestPrompt()
}

export function mount() {
  window.lucide?.createIcons()

  if (!getCurrentUser()) {
    document.getElementById('profile-signin').addEventListener('click', async (e) => {
      const btn = e.currentTarget
      btn.disabled = true
      btn.innerHTML = 'Opening sign-in…'
      try {
        await signInWithGoogle()
        // app.js's onAuthChange listener picks this up, loads cloud data,
        // and re-renders the current page automatically.
      } catch {
        const errEl = document.getElementById('profile-signin-error')
        errEl.textContent = 'Sign-in was cancelled or failed. Please try again.'
        errEl.classList.remove('hidden')
        btn.disabled = false
        btn.innerHTML = '<i data-lucide="log-in" style="width:16px;height:16px"></i> Sign in with Google'
        window.lucide?.createIcons()
      }
    })
    return
  }

  document.getElementById('sign-out').addEventListener('click', async () => {
    try {
      await signOutUser()
    } catch {
      showToast('Sign out failed, please try again', 'error')
    }
  })
}
