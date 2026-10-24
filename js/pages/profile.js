import { state, BADGE_DEFS, persist } from '../store.js'
import { formatDuration, escapeHtml } from '../utils.js'
import { getTelegramUser, setTelegramUser } from '../telegram-store.js'
import {
  sendTelegramOtp,
  verifyTelegramOtp,
  verifyTelegram2faPassword,
  signOutTelegramUser,
  getApiCredentials,
  saveApiCredentials,
  isTelegramUserLoggedIn,
} from '../telegram-mtproto.js'
import { showToast } from '../toast.js'

function renderTelegramLoginPrompt() {
  const creds = getApiCredentials()

  return `
    <div class="max-w-md mx-auto py-6">
      <div class="card p-6 md:p-8 text-center shadow-md">
        <!-- Telegram Paper Plane Icon -->
        <div class="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-500 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <i data-lucide="send" style="width:32px;height:32px"></i>
        </div>

        <h1 class="font-display text-2xl font-semibold mb-2">Log in with Telegram</h1>
        <p class="text-xs text-ink/60 dark:text-paper/60 mb-6 leading-relaxed">
          Enter your phone number to receive a verification code directly in your Telegram app.
          All uploaded study materials will be automatically saved in your <strong>Telegram Saved Messages</strong>.
        </p>

        <!-- Feedback Messages -->
        <div id="login-error-msg" class="hidden p-3 rounded-lg text-xs bg-rust/15 text-rust border border-rust/30 mb-4 text-left"></div>
        <div id="login-info-msg" class="hidden p-3 rounded-lg text-xs bg-sage/15 text-sage-dark dark:text-sage-light border border-sage/30 mb-4 text-left"></div>

        <!-- STEP 1: Phone Number -->
        <div id="step-phone" class="flex flex-col gap-3.5 text-left">
          <div>
            <label class="block text-xs font-semibold mb-1">
              Telegram Phone Number <span class="text-rust">*</span>
            </label>
            <input
              id="login-phone"
              type="tel"
              class="input font-mono text-sm tracking-wide"
              placeholder="+91 98765 43210"
              autocomplete="tel"
              required
            />
            <p class="text-[11px] text-ink/50 dark:text-paper/50 mt-1.5 leading-normal">
              Include your country code (e.g. <code>+91</code> for India, <code>+1</code> for US). We will send the login code to your Telegram app.
            </p>
          </div>

          <button type="button" id="btn-send-code" class="btn btn-primary w-full mt-2" style="padding:0.65rem 1rem;">
            <i data-lucide="send" style="width:16px;height:16px"></i> Send Telegram Login Code
          </button>
        </div>

        <!-- STEP 2: OTP Verification (Initially Hidden) -->
        <div id="step-otp" class="hidden flex flex-col gap-3.5 text-left">
          <div class="p-3 rounded-lg bg-paper-dim/60 dark:bg-ink-soft/40 border border-paper-line dark:border-ink-soft flex items-center justify-between">
            <div class="text-xs">
              <span class="text-ink/60 dark:text-paper/60">Code sent to:</span>
              <span id="target-phone-display" class="font-mono font-bold ml-1"></span>
            </div>
            <button type="button" id="btn-back-phone" class="text-xs text-marigold-dark hover:underline font-medium">
              Change
            </button>
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1 text-center">
              Enter 5-digit Telegram Code <span class="text-rust">*</span>
            </label>
            <input
              id="login-otp"
              type="text"
              maxlength="8"
              inputmode="numeric"
              class="input font-mono text-center text-xl tracking-widest font-bold py-2.5"
              placeholder="1 2 3 4 5"
              autocomplete="one-time-code"
            />
            <p class="text-[11px] text-ink/50 dark:text-paper/50 mt-1.5 text-center">
              Check your Telegram app (Saved Messages / Telegram Service chat) for the code.
            </p>
          </div>

          <button type="button" id="btn-verify-otp" class="btn btn-primary w-full mt-2" style="padding:0.65rem 1rem;">
            <i data-lucide="check-circle-2" style="width:16px;height:16px"></i> Verify & Log In
          </button>

          <button type="button" id="btn-resend-otp" class="btn btn-secondary w-full text-xs">
            Resend Code
          </button>
        </div>

        <!-- STEP 3: 2FA Password (If user has 2FA enabled) -->
        <div id="step-2fa" class="hidden flex flex-col gap-3.5 text-left">
          <div class="p-3 rounded-lg bg-marigold/10 border border-marigold/30 text-xs">
            <p class="font-semibold text-marigold-dark">Two-Step Verification (2FA) Active</p>
            <p class="text-ink/70 dark:text-paper/70 mt-0.5">Your Telegram account has cloud password protection enabled. Enter your password to complete login.</p>
          </div>

          <div>
            <label class="block text-xs font-semibold mb-1">
              Telegram 2FA Password <span class="text-rust">*</span>
            </label>
            <input
              id="login-2fa"
              type="password"
              class="input text-sm"
              placeholder="Enter your 2FA password"
              autocomplete="current-password"
            />
          </div>

          <button type="button" id="btn-verify-2fa" class="btn btn-primary w-full mt-2" style="padding:0.65rem 1rem;">
            <i data-lucide="lock" style="width:16px;height:16px"></i> Confirm Password & Log In
          </button>
        </div>

        <!-- Advanced: Custom App Credentials Accordion -->
        <details class="mt-6 text-left text-xs text-ink/60 dark:text-paper/60 border border-paper-line dark:border-ink-soft rounded-lg p-3">
          <summary class="cursor-pointer font-medium hover:text-ink dark:hover:text-paper select-none flex items-center justify-between">
            <span>Advanced: Telegram App Credentials (Optional)</span>
            <i data-lucide="sliders-horizontal" style="width:13px;height:13px"></i>
          </summary>
          <div class="mt-3 flex flex-col gap-2.5 pt-2 border-t border-paper-line dark:border-ink-soft">
            <p class="text-[11px] leading-relaxed">
              By default, Vidyalaya connects using official Telegram client credentials (API ID 2040). If you want to use your personal app credentials from <a href="https://my.telegram.org" target="_blank" rel="noopener" class="text-marigold-dark hover:underline">my.telegram.org</a>, configure them below:
            </p>
            <div>
              <label class="block text-[11px] font-semibold mb-0.5">API ID</label>
              <input id="custom-api-id" class="input font-mono text-xs py-1.5" placeholder="e.g. 2040" value="${creds.isCustom ? creds.apiId : ''}" />
            </div>
            <div>
              <label class="block text-[11px] font-semibold mb-0.5">API Hash</label>
              <input id="custom-api-hash" class="input font-mono text-xs py-1.5" placeholder="e.g. b18441a1ff607e10a989891a5462e627" value="${creds.isCustom ? creds.apiHash : ''}" />
            </div>
            <div class="flex items-center gap-2 mt-1">
              <button type="button" id="btn-save-creds" class="btn btn-secondary text-[11px] py-1 px-2.5">Save Credentials</button>
              ${creds.isCustom ? `<button type="button" id="btn-reset-creds" class="btn btn-secondary text-[11px] py-1 px-2.5 text-rust">Reset to Default</button>` : ''}
            </div>
          </div>
        </details>

        <!-- Footer Note -->
        <div class="mt-6 pt-5 border-t border-paper-line/50 dark:border-ink-soft/50 text-[11px] text-ink/40 dark:text-paper/40">
          <p>No bots, channels, or public links &bull; Direct encrypted connection to your Telegram Saved Messages.</p>
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

  const firstName = user.firstName || user.first_name || 'Student'
  const lastName = user.lastName || user.last_name || ''
  const displayName = `${firstName} ${lastName}`.trim()
  const username = user.username ? `@${user.username}` : (user.phone ? user.phone : (user.id ? `ID: ${user.id}` : ''))
  const phone = user.phone || ''

  return `
    <div class="max-w-3xl mx-auto">
      <!-- Profile banner card -->
      <div class="card flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-6 p-6">
        <div class="relative shrink-0">
          <div class="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold text-xl shadow-sm">
            <i data-lucide="send" style="width:28px;height:28px"></i>
          </div>
          <span class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-sage border-2 border-paper dark:border-ink shadow" title="Connected"></span>
        </div>

        <div class="flex-1 text-center sm:text-left">
          <div class="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-1">
            <h1 class="font-display text-xl font-semibold">${escapeHtml(displayName)}</h1>
            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 dark:text-blue-400">
              Telegram Connected
            </span>
          </div>

          <div class="flex items-center justify-center sm:justify-start gap-3 text-xs text-ink/60 dark:text-paper/60 font-mono mb-2 flex-wrap">
            ${username ? `<span>${escapeHtml(username)}</span>` : ''}
            ${phone && phone !== username ? `<span>&bull; ${escapeHtml(phone)}</span>` : ''}
          </div>

          <p class="text-xs text-sage font-medium flex items-center justify-center sm:justify-start gap-1">
            <i data-lucide="check-circle-2" style="width:13px;height:13px"></i>
            Saved Messages Cloud Vault Active (chat: "me")
          </p>
        </div>

        <div class="flex sm:flex-col items-center gap-2 shrink-0">
          <a href="https://web.telegram.org/a/" target="_blank" rel="noopener" class="btn btn-secondary text-xs">
            <i data-lucide="external-link" style="width:13px;height:13px"></i> Telegram
          </a>
          <button id="tg-logout-btn" class="btn btn-secondary text-xs hover:border-rust hover:text-rust">
            <i data-lucide="log-out" style="width:13px;height:13px"></i> Sign out
          </button>
        </div>
      </div>

      <!-- Vault info notice -->
      <div class="p-4 rounded-xl border border-sage/40 bg-sage/10 text-xs mb-6 flex items-start gap-3">
        <i data-lucide="cloud-check" class="text-sage mt-0.5 shrink-0" style="width:18px;height:18px"></i>
        <div class="leading-relaxed">
          <p class="font-semibold text-sage-dark dark:text-sage-light">Telegram Saved Messages Active</p>
          <p class="text-ink/70 dark:text-paper/70 mt-0.5">
            Every file you upload in any subject folder is instantly sent to your personal Telegram <strong>Saved Messages</strong> chat and cached locally for instant in-browser reading. Access your study materials anytime from your phone, laptop, or tablet.
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
    const stepPhone = document.getElementById('step-phone')
    const stepOtp = document.getElementById('step-otp')
    const step2fa = document.getElementById('step-2fa')
    const phoneInput = document.getElementById('login-phone')
    const otpInput = document.getElementById('login-otp')
    const pass2faInput = document.getElementById('login-2fa')
    const sendBtn = document.getElementById('btn-send-code')
    const verifyOtpBtn = document.getElementById('btn-verify-otp')
    const verify2faBtn = document.getElementById('btn-verify-2fa')
    const resendBtn = document.getElementById('btn-resend-otp')
    const backPhoneBtn = document.getElementById('btn-back-phone')
    const targetPhoneDisplay = document.getElementById('target-phone-display')
    const errorBox = document.getElementById('login-error-msg')
    const infoBox = document.getElementById('login-info-msg')

    let activePhoneNumber = ''

    function showError(msg) {
      if (!errorBox) return
      errorBox.textContent = msg
      errorBox.classList.remove('hidden')
      infoBox?.classList.add('hidden')
    }

    function showInfo(msg) {
      if (!infoBox) return
      infoBox.textContent = msg
      infoBox.classList.remove('hidden')
      errorBox?.classList.add('hidden')
    }

    function clearMessages() {
      errorBox?.classList.add('hidden')
      infoBox?.classList.add('hidden')
    }

    // Step 1: Send OTP
    async function handleSendCode() {
      const rawPhone = (phoneInput?.value || '').trim()
      if (!rawPhone) {
        showError('Please enter your phone number with country code (e.g. +91 9876543210)')
        phoneInput?.focus()
        return
      }

      clearMessages()
      sendBtn.disabled = true
      sendBtn.innerHTML = `<span class="animate-pulse">Connecting to Telegram…</span>`

      try {
        const result = await sendTelegramOtp(rawPhone)
        activePhoneNumber = result.phoneNumber

        if (targetPhoneDisplay) targetPhoneDisplay.textContent = activePhoneNumber
        stepPhone?.classList.add('hidden')
        stepOtp?.classList.remove('hidden')
        step2fa?.classList.add('hidden')

        showToast('Login code sent to your Telegram app!', 'success')
        showInfo(`A verification code was sent to your Telegram app. Enter it below:`)
        otpInput?.focus()
      } catch (err) {
        console.error('Send OTP error:', err)
        showError(err.message || 'Failed to send login code. Please check your phone number.')
        showToast(err.message || 'Could not send code', 'error')
      } finally {
        sendBtn.disabled = false
        sendBtn.innerHTML = `<i data-lucide="send" style="width:16px;height:16px"></i> Send Telegram Login Code`
        window.lucide?.createIcons()
      }
    }

    sendBtn?.addEventListener('click', handleSendCode)
    phoneInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSendCode()
      }
    })

    // Step 2: Verify OTP
    async function handleVerifyOtp() {
      const code = (otpInput?.value || '').trim()
      if (!code) {
        showError('Please enter the OTP code from your Telegram app.')
        otpInput?.focus()
        return
      }

      clearMessages()
      verifyOtpBtn.disabled = true
      verifyOtpBtn.innerHTML = `<span class="animate-pulse">Verifying code…</span>`

      try {
        const result = await verifyTelegramOtp(code)

        if (result.needs2fa) {
          stepOtp?.classList.add('hidden')
          step2fa?.classList.remove('hidden')
          showInfo('Two-Step Verification (2FA) is enabled. Enter your cloud password:')
          pass2faInput?.focus()
          return
        }

        if (result.ok && result.user) {
          onLoginSuccess(result.user)
        }
      } catch (err) {
        console.error('Verify OTP error:', err)
        showError(err.message || 'Invalid code. Please check and try again.')
        showToast(err.message || 'Verification failed', 'error')
      } finally {
        verifyOtpBtn.disabled = false
        verifyOtpBtn.innerHTML = `<i data-lucide="check-circle-2" style="width:16px;height:16px"></i> Verify & Log In`
        window.lucide?.createIcons()
      }
    }

    verifyOtpBtn?.addEventListener('click', handleVerifyOtp)
    otpInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleVerifyOtp()
      }
    })

    // Step 3: Verify 2FA
    async function handleVerify2fa() {
      const password = (pass2faInput?.value || '').trim()
      if (!password) {
        showError('Please enter your 2FA password.')
        pass2faInput?.focus()
        return
      }

      clearMessages()
      verify2faBtn.disabled = true
      verify2faBtn.innerHTML = `<span class="animate-pulse">Verifying password…</span>`

      try {
        const result = await verifyTelegram2faPassword(password)
        if (result.ok && result.user) {
          onLoginSuccess(result.user)
        }
      } catch (err) {
        console.error('2FA error:', err)
        showError(err.message || 'Incorrect 2FA password. Please try again.')
        showToast(err.message || '2FA verification failed', 'error')
      } finally {
        verify2faBtn.disabled = false
        verify2faBtn.innerHTML = `<i data-lucide="lock" style="width:16px;height:16px"></i> Confirm Password & Log In`
        window.lucide?.createIcons()
      }
    }

    verify2faBtn?.addEventListener('click', handleVerify2fa)
    pass2faInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleVerify2fa()
      }
    })

    // Back to Phone Step
    backPhoneBtn?.addEventListener('click', () => {
      clearMessages()
      stepOtp?.classList.add('hidden')
      step2fa?.classList.add('hidden')
      stepPhone?.classList.remove('hidden')
      phoneInput?.focus()
    })

    // Resend OTP
    resendBtn?.addEventListener('click', () => {
      handleSendCode()
    })

    // Custom App Credentials handlers
    document.getElementById('btn-save-creds')?.addEventListener('click', () => {
      const apiId = document.getElementById('custom-api-id')?.value.trim()
      const apiHash = document.getElementById('custom-api-hash')?.value.trim()
      if (!apiId || !apiHash) {
        showToast('Please enter both API ID and API Hash', 'error')
        return
      }
      saveApiCredentials(apiId, apiHash)
      showToast('Custom credentials saved!', 'success')
      location.reload()
    })

    document.getElementById('btn-reset-creds')?.addEventListener('click', () => {
      saveApiCredentials(null, null)
      showToast('Reset to default credentials', 'success')
      location.reload()
    })

    function onLoginSuccess(user) {
      setTelegramUser(user)

      // Sync state profile
      const name = user.firstName || user.first_name || 'Student'
      state.profile.name = name
      if (user.username) state.profile.telegramUsername = user.username
      if (user.phone) state.profile.telegramPhone = user.phone
      persist()

      showToast(`Welcome ${name}! Connected to Telegram Saved Messages.`, 'success')
      location.hash = '#/profile'
      location.reload()
    }
  } else {
    // Logged in handlers
    document.getElementById('tg-logout-btn')?.addEventListener('click', async () => {
      if (confirm('Sign out from your Telegram account?')) {
        await signOutTelegramUser()
        setTelegramUser(null)
        showToast('Signed out from Telegram', 'success')
        location.hash = '#/profile'
        location.reload()
      }
    })
  }
}
