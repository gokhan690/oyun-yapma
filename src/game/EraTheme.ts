export interface EraTheme {
  cssClass: string
  label: string
  year: number
  flavor: string
}

/** Baron #1 ≈ 2026, her yeni baron ~15 yıl ileri — nesil bazlı dönem hissi */
export function eraForBaron(baronNumber: number, generation: number): EraTheme {
  const year = 2026 + (baronNumber - 1) * 15 + Math.max(0, generation - 1) * 3
  if (baronNumber <= 1 && generation <= 1) {
    return {
      cssClass: 'era-youth',
      label: 'Genç Girişimci Çağı',
      year,
      flavor: 'Startup ve mahalle işletmeleri — herkes bir şeyler kuruyor.',
    }
  }
  if (baronNumber <= 2 || generation <= 2) {
    return {
      cssClass: 'era-growth',
      label: 'Büyüme ve Dijitalleşme',
      year,
      flavor: 'E-ticaret patladı, herkes IPO peşinde koşuyor.',
    }
  }
  if (baronNumber <= 3 || generation <= 3) {
    return {
      cssClass: 'era-consolidation',
      label: 'Konsolidasyon Dönemi',
      year,
      flavor: 'Küçükler elendi — dev holdingler ve torpil ağları konuşuluyor.',
    }
  }
  return {
    cssClass: 'era-empire',
    label: 'İmparatorluk Çağı',
    year,
    flavor: 'Sınır ötesi genişleme, Dubai ve Londra masada.',
  }
}

export function applyEraTheme(root: HTMLElement, baronNumber: number, generation: number): EraTheme {
  const era = eraForBaron(baronNumber, generation)
  root.classList.remove('era-youth', 'era-growth', 'era-consolidation', 'era-empire')
  root.classList.add(era.cssClass)
  root.dataset.eraYear = String(era.year)
  root.dataset.eraLabel = era.label
  return era
}
