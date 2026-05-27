import fs from 'node:fs'

const path = 'src/ui/styles.css'
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/)
const start = 483
const end = 512
const shop = lines.slice(start, end).join('\n')
fs.mkdirSync('src/ui/styles', { recursive: true })
fs.writeFileSync('src/ui/styles/shop.css', `${shop}\n`)
const rest = [...lines.slice(0, start), "@import './styles/shop.css';", ...lines.slice(end)].join('\n')
fs.writeFileSync(path, rest)
console.log('extracted shop chrome', end - start, 'lines')
