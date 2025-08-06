import { getHighlighter } from 'shiki'

let highlighterPromise: ReturnType<typeof getHighlighter> | null = null

export function getShikiHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = getHighlighter({
      themes: ['github-dark', 'github-light'],
      langs: ['javascript', 'typescript', 'tsx', 'jsx', 'json', 'markdown', 'bash', 'css', 'html']
    })
  }
  return highlighterPromise
}