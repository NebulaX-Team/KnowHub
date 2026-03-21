/**
 * LaTeX公式解析和转换工具
 * 用于将Markdown中的LaTeX公式转换为Tiptap编辑器支持的格式
 */

/**
 * 处理Markdown内容中的LaTeX公式
 * @param content Markdown内容
 * @returns 处理后的内容，LaTeX公式被转换为HTML格式
 */
export function processLatexInMarkdown(content: string): string {
  const blockTokens: string[] = []

  // 仅将“独占一行”的 $$...$$ 识别为块级公式
  let processed = content.replace(
    /(^|\n)[ \t]*\$\$[ \t]*\n?([\s\S]*?)\n?[ \t]*\$\$[ \t]*(?=\n|$)/g,
    (_match, leading, latex) => {
      const normalizedLatex = normalizeLatex(String(latex || ''))
      const escapedLatex = escapeHtml(normalizedLatex)
      const token = `__KNOWHUB_MATH_BLOCK_${blockTokens.length}__`
      blockTokens.push(`<div data-math-block="" data-latex="${escapedLatex}"></div>`)
      return `${leading}${token}`
    },
  )

  // 处理行内 $$...$$（出现在同一行文本中的情况）
  processed = processed.replace(/\$\$([^\n]+?)\$\$/g, (_match, latex) => {
    const normalizedLatex = normalizeLatex(String(latex || ''))
    const escapedLatex = escapeHtml(normalizedLatex)
    return `<span data-math-inline="" data-latex="${escapedLatex}"></span>`
  })

  // 处理行内 $...$
  processed = processed.replace(/\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_match, latex) => {
    const normalizedLatex = normalizeLatex(String(latex || ''))
    const escapedLatex = escapeHtml(normalizedLatex)
    return `<span data-math-inline="" data-latex="${escapedLatex}"></span>`
  })

  // 还原块级公式占位
  processed = processed.replace(/__KNOWHUB_MATH_BLOCK_(\d+)__/g, (_match, index) => {
    const i = Number(index)
    return Number.isNaN(i) ? _match : (blockTokens[i] || _match)
  })

  return processed
}

function normalizeLatex(input: string): string {
  let latex = input.trim()

  // 兼容 \(...\) 和 \[...\] 包裹写法
  const inlineWrapped = latex.match(/^\\\(([\s\S]*)\\\)$/)
  if (inlineWrapped) {
    latex = inlineWrapped[1].trim()
  }

  const blockWrapped = latex.match(/^\\\[([\s\S]*)\\\]$/)
  if (blockWrapped) {
    latex = blockWrapped[1].trim()
  }

  return latex
}

/**
 * 转义HTML特殊字符
 * @param text 需要转义的文本
 * @returns 转义后的文本
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * 检查内容是否包含LaTeX公式
 * @param content 内容
 * @returns 是否包含LaTeX公式
 */
export function containsLatex(content: string): boolean {
  return /\$\$[\s\S]*?\$\$|\$(?!\$)[^\$\n]+?\$(?!\$)/.test(content)
}
