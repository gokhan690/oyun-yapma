import type { GameState } from '../../game/GameState'
import { formatMoney } from '../../game/Economy'
import { DEPARTMENTS, DEPARTMENT_MAX_LEVEL } from '../../game/EmpireDepartments'

/**
 * İmparatorluk departman yönetim paneli (Karar 11-13).
 * Patron olduktan sonra oyunun ana yönetim merkezi.
 */
export class DepartmentsPanel {
  readonly root: HTMLElement
  private state: GameState
  private onChange: () => void

  constructor(state: GameState, onChange: () => void) {
    this.state = state
    this.onChange = onChange
    this.root = document.createElement('div')
    this.root.className = 'departments-panel'
    this.render()
  }

  render(): void {
    const s = this.state
    this.root.replaceChildren()

    const header = document.createElement('div')
    header.className = 'dept-header'
    header.innerHTML = `
      <h3 class="dept-title">🏛️ İmparatorluğu Yönet</h3>
      <p class="dept-sub">Departmanları geliştir — küçük ama kalıcı bonuslar + görevler.</p>
    `
    this.root.appendChild(header)

    const grid = document.createElement('div')
    grid.className = 'dept-grid'

    for (const def of DEPARTMENTS) {
      const unlocked = s.isDepartmentUnlocked(def.id)
      const level = s.departmentLevel(def.id)
      const card = document.createElement('div')
      card.className = `dept-card${unlocked ? '' : ' dept-locked'}`

      if (!unlocked) {
        card.innerHTML = `
          <div class="dept-card-head">
            <span class="dept-emoji">${def.emoji}</span>
            <strong>${def.name}</strong>
            <span class="dept-level-badge">🔒</span>
          </div>
          <small class="dept-unlock">Açmak için: ${formatMoney(def.unlockAt)} toplam kazanç</small>
        `
        grid.appendChild(card)
        continue
      }

      const taskReady = s.departmentTaskReady(def.id)
      const isMax = level >= DEPARTMENT_MAX_LEVEL
      const cost = s.departmentUpgradeCostFor(def.id)
      const pct = Math.round((level / DEPARTMENT_MAX_LEVEL) * 100)

      card.innerHTML = `
        <div class="dept-card-head">
          <span class="dept-emoji">${def.emoji}</span>
          <strong>${def.name}</strong>
          <span class="dept-level-badge">Lv.${level}</span>
        </div>
        <small class="dept-bonus">${def.bonusPerLevel}</small>
        <div class="dept-progress"><div class="dept-progress-fill" style="width:${pct}%"></div></div>
      `

      // Seviye atlatma butonu
      if (!isMax) {
        const upBtn = document.createElement('button')
        upBtn.type = 'button'
        upBtn.className = 'btn-primary dept-upgrade-btn'
        upBtn.disabled = !s.canAfford(cost)
        upBtn.innerHTML = `⬆️ Lv.${level + 1} · ${formatMoney(cost)}`
        upBtn.addEventListener('click', () => {
          if (s.upgradeDepartment(def.id)) {
            this.render()
            this.onChange()
          }
        })
        card.appendChild(upBtn)
      } else {
        const maxBadge = document.createElement('div')
        maxBadge.className = 'dept-max-badge'
        maxBadge.textContent = '⭐ Maksimum Seviye'
        card.appendChild(maxBadge)
      }

      // Görev (Karar 13)
      const task = document.createElement('div')
      task.className = `dept-task${taskReady ? ' dept-task-ready' : ''}`
      if (taskReady) {
        const claimBtn = document.createElement('button')
        claimBtn.type = 'button'
        claimBtn.className = 'btn-secondary dept-task-btn'
        claimBtn.innerHTML = `✅ Görev hazır: Ödül al`
        claimBtn.addEventListener('click', () => {
          if (s.claimDepartmentTask(def.id)) {
            this.render()
            this.onChange()
          }
        })
        task.appendChild(claimBtn)
      } else {
        task.innerHTML = `<small class="dept-task-label">🎯 Görev: ${def.taskLabel}</small>`
      }
      card.appendChild(task)

      grid.appendChild(card)
    }

    this.root.appendChild(grid)
  }
}
