import { sectionTitle, ua, starsHtml, demoBanner } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'

interface Member { avatar: string; name: string; role: string; age: number; trait: string; edu: string; stars: number; heir?: boolean }
const MEMBERS: Member[] = [
  { avatar: REF_ASSETS_V2_GENERIC.avatars.femaleAdult, name: 'Selin Karahan', role: 'Eş · CFO',     age: 31, trait: 'Stratejik', edu: 'MBA',        stars: 4 },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.youngMale,   name: 'Kaan Karahan',  role: 'Oğul · Varis',  age: 19, trait: 'Hırslı',    edu: 'Üniversite', stars: 4, heir: true },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.youngFemale, name: 'Defne Karahan', role: 'Kız · Stajyer', age: 16, trait: 'Yaratıcı',  edu: 'Lise',       stars: 3 },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.elder,       name: 'Rıfat Karahan', role: 'Mentor',        age: 64, trait: 'Bilge',     edu: 'Doktora',    stars: 5 },
]

const HEIR = MEMBERS.find(m => m.heir)!

interface Legacy { asset: string; name: string; pct: number }
const LEGACY: Legacy[] = [
  { asset: REF_ASSETS_V2_GENERIC.family.heirCrown,         name: 'Varis Eğitimi',   pct: 72 },
  { asset: REF_ASSETS_V2_GENERIC.family.inheritanceShield, name: 'Miras Planı',     pct: 55 },
  { asset: REF_ASSETS_V2_GENERIC.family.protectionBadge,   name: 'Servet Koruması', pct: 88 },
]

export class RefFamilyPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'AİLE'

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-family-page'

    this.el.appendChild(demoBanner('hanedan/aile paneli henüz oyun verisine bağlı değil'))

    // Hanedan başlığı
    const crest = document.createElement('div')
    crest.className = 'ref-dynasty-head'
    crest.innerHTML = `
      <img src="${ua(REF_ASSETS_V2_GENERIC.family.crest)}" alt="" class="ref-dynasty-crest">
      <div class="ref-dynasty-info">
        <div class="ref-dynasty-name">Karahan Hanedanı</div>
        <div class="ref-dynasty-sub">3. Nesil · Kuruluş 1998</div>
        <div class="ref-dynasty-stars">${starsHtml(5)}</div>
      </div>
      <div class="ref-dynasty-score">
        <div class="ref-dynasty-score__n">A+</div>
        <div class="ref-dynasty-score__l">Koruma</div>
      </div>
    `
    this.el.appendChild(crest)

    // Seçilen varis kartı
    const heir = document.createElement('div')
    heir.className = 'ref-heir-card'
    heir.innerHTML = `
      <img src="${ua(HEIR.avatar)}" alt="" class="ref-heir-avatar">
      <div class="ref-heir-main">
        <div class="ref-heir-top"><span class="ref-heir-crown">👑</span><span class="ref-heir-name">${HEIR.name}</span><span class="ref-heir-tag">VARİS</span></div>
        <div class="ref-heir-meta">${HEIR.age} yaş · ${HEIR.trait} · ${HEIR.edu}</div>
        <div class="ref-stars ref-heir-stars">${starsHtml(HEIR.stars)}</div>
      </div>
    `
    this.el.appendChild(heir)

    // Miras hazırlığı
    this.el.appendChild(sectionTitle('Miras Hazırlığı'))
    const legacy = document.createElement('div')
    legacy.className = 'ref-legacy-list'
    legacy.innerHTML = LEGACY.map(l => `
      <div class="ref-legacy-row">
        <img src="${ua(l.asset)}" alt="" class="ref-legacy-ico">
        <div class="ref-legacy-main">
          <div class="ref-legacy-head"><span class="ref-legacy-name">${l.name}</span><span class="ref-legacy-pct">%${l.pct}</span></div>
          <div class="ref-perf-track sm"><div class="ref-perf-fill ${l.pct >= 70 ? 'high' : 'medium'}" style="width:${l.pct}%"></div></div>
        </div>
      </div>
    `).join('')
    this.el.appendChild(legacy)

    // Aile üyeleri (zengin satır)
    this.el.appendChild(sectionTitle('Aile Üyeleri', `${MEMBERS.length} kişi`))
    const list = document.createElement('div')
    list.className = 'ref-member-list'
    list.innerHTML = MEMBERS.map(m => `
      <div class="ref-member-row">
        <img src="${ua(m.avatar)}" alt="" class="ref-member-avatar">
        <div class="ref-member-main">
          <div class="ref-member-name">${m.name} ${m.heir ? '<span class="ref-heir-tag">VARİS</span>' : ''}</div>
          <div class="ref-member-role">${m.role}</div>
          <div class="ref-member-tags">
            <span class="ref-member-chip">🎂 ${m.age}</span>
            <span class="ref-member-chip">✨ ${m.trait}</span>
            <span class="ref-member-chip">🎓 ${m.edu}</span>
          </div>
        </div>
        <div class="ref-stars ref-member-stars">${starsHtml(m.stars)}</div>
      </div>
    `).join('')
    this.el.appendChild(list)
  }
}
