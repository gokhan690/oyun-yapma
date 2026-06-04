import { sectionTitle, ua, starsHtml } from './refShared'
import { REF_ASSETS_V2_GENERIC } from './refAssetsV2Generic'
import type { RefPage } from './RefApp'

interface Member { avatar: string; name: string; role: string; stars: number; heir?: boolean }
const MEMBERS: Member[] = [
  { avatar: REF_ASSETS_V2_GENERIC.avatars.mainBusinessman, name: 'Mert Karahan', role: 'Hanedan Reisi', stars: 5 },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.femaleAdult,     name: 'Selin Karahan', role: 'Eş · CFO', stars: 4 },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.youngMale,       name: 'Kaan Karahan',  role: 'Oğul · Varis', stars: 4, heir: true },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.youngFemale,     name: 'Defne Karahan', role: 'Kız · Stajyer', stars: 3 },
  { avatar: REF_ASSETS_V2_GENERIC.avatars.elder,           name: 'Rıfat Karahan', role: 'Mentor', stars: 5 },
]

interface Legacy { asset: string; name: string; desc: string }
const LEGACY: Legacy[] = [
  { asset: REF_ASSETS_V2_GENERIC.family.heirCrown,         name: 'Varis Tacı',     desc: 'Sonraki nesle +%20 prestij' },
  { asset: REF_ASSETS_V2_GENERIC.family.inheritanceShield, name: 'Miras Kalkanı',  desc: 'Servetin %30’u korunur' },
  { asset: REF_ASSETS_V2_GENERIC.family.protectionBadge,   name: 'Koruma Rozeti',  desc: 'Baskınlara karşı dokunulmazlık' },
]

export class RefFamilyPage implements RefPage {
  readonly el: HTMLElement
  readonly title = 'AİLE'

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'ref-page ref-family-page'

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
    `
    this.el.appendChild(crest)

    // Aile üyeleri
    this.el.appendChild(sectionTitle('Aile Üyeleri'))
    const list = document.createElement('div')
    list.className = 'ref-member-list'
    list.innerHTML = MEMBERS.map(m => `
      <div class="ref-member-row">
        <img src="${ua(m.avatar)}" alt="" class="ref-member-avatar">
        <div class="ref-member-main">
          <div class="ref-member-name">${m.name} ${m.heir ? '<span class="ref-heir-tag">VARİS</span>' : ''}</div>
          <div class="ref-member-role">${m.role}</div>
        </div>
        <div class="ref-stars ref-member-stars">${starsHtml(m.stars)}</div>
      </div>
    `).join('')
    this.el.appendChild(list)

    // Miras
    this.el.appendChild(sectionTitle('Hanedan Mirası'))
    const legacy = document.createElement('div')
    legacy.className = 'ref-legacy-list'
    legacy.innerHTML = LEGACY.map(l => `
      <div class="ref-legacy-row">
        <img src="${ua(l.asset)}" alt="" class="ref-legacy-ico">
        <div class="ref-legacy-main">
          <div class="ref-legacy-name">${l.name}</div>
          <div class="ref-legacy-desc">${l.desc}</div>
        </div>
      </div>
    `).join('')
    this.el.appendChild(legacy)
  }
}
