/** Vite base path uyumlu statik dosya yolu (GitHub Pages / Render). */
export function assetUrl(path: string): string {
  const base = import.meta.env.BASE_URL
  const clean = path.startsWith('/') ? path.slice(1) : path
  return `${base}${clean}`
}

export function playerAge(birthYear: number): number | null {
  if (!birthYear || birthYear < 1900 || birthYear > new Date().getFullYear()) return null
  return new Date().getFullYear() - birthYear
}
