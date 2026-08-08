import { state, BADGE_DEFS } from '../store.js'

export function render() {
  return `
    <div class="max-w-5xl mx-auto">
      <h1 class="font-display text-2xl font-semibold mb-1">Achievements</h1>
      <p class="text-sm text-ink/50 dark:text-paper/50 mb-6">${state.achievements.length} of ${BADGE_DEFS.length} badges unlocked</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        ${BADGE_DEFS.map((b) => {
          const unlocked = state.achievements.includes(b.id)
          return `
            <div class="flex flex-col items-center text-center p-5 rounded-xl border ${unlocked ? 'border-marigold/40 bg-marigold/5' : 'border-paper-line dark:border-ink-soft opacity-50'}">
              <div class="w-12 h-12 rounded-full flex items-center justify-center mb-3 ${unlocked ? 'bg-marigold/20' : 'bg-ink/5 dark:bg-paper/10'}">
                <i data-lucide="${unlocked ? 'award' : 'lock'}" class="${unlocked ? 'text-marigold-dark' : 'text-ink/30 dark:text-paper/30'}" style="width:20px;height:20px"></i>
              </div>
              <p class="text-xs font-medium leading-tight">${b.label}</p>
            </div>`
        }).join('')}
      </div>
    </div>
  `
}

export function mount() {
  window.lucide?.createIcons()
}
