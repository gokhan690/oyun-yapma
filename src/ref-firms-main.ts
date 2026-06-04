import { RefFirmsPage } from './ui/ref/RefFirmsPage'

const root = document.getElementById('ref-root')
if (root) {
  const page = new RefFirmsPage()
  page.mount(root)
}
