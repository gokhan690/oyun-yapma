import { RefApp } from './ui/ref/RefApp'

const root = document.getElementById('ref-root')
if (root) {
  const app = new RefApp('firms')
  app.mount(root)
}
