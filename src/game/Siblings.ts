export type SiblingRelation = 'brother' | 'sister'

export interface Sibling {
  id: string
  name: string
  relation: SiblingRelation
  age: number
  relationshipScore: number
  isAlive: boolean
}

const BROTHER_NAMES = ['Ahmet', 'Mehmet', 'Ali', 'Hasan', 'Kemal', 'Murat', 'Emre', 'Burak']
const SISTER_NAMES  = ['Ayşe', 'Fatma', 'Zeynep', 'Selin', 'Esra', 'Deniz', 'Şeyma', 'Nur']

export function generateSiblings(): Sibling[] {
  const count = Math.floor(Math.random() * 3)
  const siblings: Sibling[] = []
  for (let i = 0; i < count; i++) {
    const relation: SiblingRelation = Math.random() < 0.5 ? 'brother' : 'sister'
    const names = relation === 'brother' ? BROTHER_NAMES : SISTER_NAMES
    const name  = names[Math.floor(Math.random() * names.length)]!
    siblings.push({
      id: `sibling_${i}`,
      name,
      relation,
      age: 22 + Math.floor(Math.random() * 12),
      relationshipScore: 40 + Math.floor(Math.random() * 40),
      isAlive: true,
    })
  }
  return siblings
}

export function tickSiblingYear(siblings: Sibling[]): Sibling | null {
  for (const s of siblings) {
    if (!s.isAlive) continue
    s.age++
    const deathChance = s.age > 75 ? 0.06 : s.age > 65 ? 0.02 : 0.004
    if (Math.random() < deathChance) {
      s.isAlive = false
      return s
    }
    // Slow relationship decay without visits
    s.relationshipScore = Math.max(5, s.relationshipScore - 1)
  }
  return null
}

export const VISIT_SIBLING_COST = 10_000

export function visitSibling(sibling: Sibling): void {
  sibling.relationshipScore = Math.min(100, sibling.relationshipScore + 15)
}

export function siblingInheritance(sibling: Sibling): number {
  return Math.floor(50_000 * (sibling.relationshipScore / 100))
}

export function siblingRelationLabel(s: Sibling): string {
  return s.relation === 'brother' ? 'Kardeş (Erkek)' : 'Kardeş (Kız)'
}
