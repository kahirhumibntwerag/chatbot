import { getShikiHighlighter } from "@/lib/shiki-highlighter"

export async function highlightCode(code: string, language: string) {
  const highlighter = await getShikiHighlighter()

  try {
    const html = await highlighter.codeToHtml(code, {
      lang: language,
      themes: {
        light: 'github-light',
        dark: 'github-dark'
      }
    })

    return html.replace(/<pre[^>]*>/g, '').replace('</pre>', '')
  } catch (error) {
    return code
  }
}