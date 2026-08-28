/**
 * Meyve Birleştir'i tek bir HTML dosyasına paketler (CSS + JS gömülü).
 * Telefonda paylaşmak / statik bir yere atmak için:
 *   node scripts/build-merge-standalone.mjs [cikti.html]
 */
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { build } from 'vite'

const out = path.resolve(process.argv[2] || 'meyve-birlestir.html')
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-standalone-'))

await build({
  configFile: false,
  logLevel: 'warn',
  build: {
    lib: { entry: 'src/merge-main.ts', name: 'MeyveBirlestir', formats: ['iife'], fileName: () => 'merge.js' },
    outDir: tmp,
    emptyOutDir: true,
    cssCodeSplit: false,
    target: 'es2020',
  },
})

const files = fs.readdirSync(tmp)
const cssFile = files.find((f) => f.endsWith('.css'))
const js = fs.readFileSync(path.join(tmp, 'merge.js'), 'utf8')
const css = cssFile ? fs.readFileSync(path.join(tmp, cssFile), 'utf8') : ''

const source = fs.readFileSync('merge.html', 'utf8')
const body = source.split('<body>')[1].split('</body>')[0].replace(/\s*<script[\s\S]*?<\/script>\s*/g, '\n')

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#2b1c0f" />
<meta name="description" content="Meyve Birleştir — reklamsız, çevrimdışı çalışan meyve birleştirme oyunu." />
<title>Meyve Birleştir</title>
<style>${css}</style>
</head>
<body>${body}<script>${js.replace(/<\/script/gi, '<\\/script')}</script>
</body>
</html>
`

fs.writeFileSync(out, html)
fs.rmSync(tmp, { recursive: true, force: true })
console.log(`Tek dosya hazır: ${out} (${(html.length / 1024).toFixed(1)} KB)`)
