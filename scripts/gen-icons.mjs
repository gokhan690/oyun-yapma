import fs from 'fs'
import path from 'path'

const dir = 'public/icons/businesses'
const items = [
  { id: 'stajyer', c: '#64748b', shape: 'person' },
  { id: 'robot', c: '#3b82f6', shape: 'bot' },
  { id: 'ofis', c: '#10b981', shape: 'office' },
  { id: 'fabrika', c: '#fbbf24', shape: 'factory' },
  { id: 'holding', c: '#f59e0b', shape: 'tower' },
  { id: 'uzay', c: '#fb923c', shape: 'rocket' },
  { id: 'ai', c: '#f87171', shape: 'chip' },
  { id: 'tuzaq', c: '#ef4444', shape: 'net' },
  { id: 'uydu', c: '#a78bfa', shape: 'sat' },
  { id: 'merkezbankasi', c: '#c4b5fd', shape: 'bank' },
  { id: 'galaksiyum', c: '#8b5cf6', shape: 'galaxy' },
  { id: 'kafe', c: '#92400e', shape: 'office' },
  { id: 'mobil_app', c: '#0ea5e9', shape: 'chip' },
  { id: 'enerji', c: '#eab308', shape: 'rocket' },
  { id: 'bahis', c: '#7f1d1d', shape: 'net' },
  { id: 'piramit', c: '#991b1b', shape: 'tower' },
  { id: 'offshore', c: '#1e3a5f', shape: 'bank' },
]

const shapes = {
  person: '<circle cx="32" cy="22" r="10" fill="white" opacity="0.9"/><rect x="22" y="34" width="20" height="22" rx="6" fill="white" opacity="0.85"/>',
  bot: '<rect x="18" y="20" width="28" height="24" rx="6" fill="white" opacity="0.9"/><circle cx="26" cy="30" r="4" fill="#1e293b"/><circle cx="38" cy="30" r="4" fill="#1e293b"/>',
  office: '<rect x="16" y="18" width="32" height="36" rx="4" fill="white" opacity="0.9"/><rect x="22" y="26" width="8" height="8" fill="#1e293b" opacity="0.35"/><rect x="34" y="26" width="8" height="8" fill="#1e293b" opacity="0.35"/>',
  factory: '<rect x="14" y="28" width="16" height="26" fill="white" opacity="0.85"/><rect x="34" y="20" width="16" height="34" fill="white" opacity="0.9"/><rect x="38" y="12" width="4" height="10" fill="white" opacity="0.7"/>',
  tower: '<rect x="24" y="14" width="16" height="40" rx="3" fill="white" opacity="0.9"/><rect x="28" y="20" width="8" height="6" fill="#1e293b" opacity="0.35"/>',
  rocket: '<path d="M32 12 L38 40 L32 36 L26 40 Z" fill="white" opacity="0.9"/><circle cx="32" cy="28" r="5" fill="#1e293b" opacity="0.45"/>',
  chip: '<rect x="18" y="18" width="28" height="28" rx="4" fill="white" opacity="0.9"/><path d="M32 24 L38 32 L32 40 L26 32 Z" fill="#1e293b" opacity="0.5"/>',
  net: '<circle cx="32" cy="32" r="18" fill="none" stroke="white" stroke-width="3" opacity="0.9"/><line x1="32" y1="14" x2="32" y2="50" stroke="white" stroke-width="2" opacity="0.7"/><line x1="14" y1="32" x2="50" y2="32" stroke="white" stroke-width="2" opacity="0.7"/>',
  sat: '<ellipse cx="32" cy="36" rx="20" ry="8" fill="white" opacity="0.3"/><rect x="28" y="20" width="8" height="20" fill="white" opacity="0.9"/><circle cx="32" cy="18" r="6" fill="white" opacity="0.85"/>',
  bank: '<rect x="14" y="24" width="36" height="28" rx="4" fill="white" opacity="0.9"/><polygon points="32,14 48,24 16,24" fill="white" opacity="0.85"/>',
  galaxy: '<circle cx="32" cy="32" r="20" fill="none" stroke="white" stroke-width="2" opacity="0.8"/><circle cx="32" cy="32" r="8" fill="white" opacity="0.9"/><circle cx="22" cy="26" r="3" fill="white" opacity="0.7"/><circle cx="42" cy="38" r="4" fill="white" opacity="0.7"/>',
}

for (const it of items) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="${it.c}"/><g>${shapes[it.shape]}</g></svg>`
  fs.writeFileSync(path.join(dir, `${it.id}.svg`), svg)
}

console.log('Generated', items.length, 'business icons')
