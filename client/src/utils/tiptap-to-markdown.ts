/**
 * Convert Tiptap JSON document to Markdown string.
 */

interface TiptapNode {
  type: string
  content?: TiptapNode[]
  text?: string
  attrs?: Record<string, any>
  marks?: Array<{ type: string; attrs?: Record<string, any> }>
}

export interface TiptapToMarkdownOptions {
  title?: string
  description?: string
}

export function tiptapToMarkdown(doc: TiptapNode, options?: TiptapToMarkdownOptions): string {
  if (!doc || !doc.content) return ''
  let result = ''
  if (options?.title || options?.description) {
    result += '---\n'
    if (options.title) result += `title: ${options.title}\n`
    if (options.description) result += `description: ${options.description}\n`
    result += '---\n\n'
  }
  result += convertNodes(doc.content).trimEnd() + '\n'
  return result
}

function convertNodes(nodes: TiptapNode[]): string {
  let result = ''
  for (let i = 0; i < nodes.length; i++) {
    result += convertNode(nodes[i], i, nodes)
  }
  return result
}

function convertNode(node: TiptapNode, _index: number, _siblings: TiptapNode[]): string {
  switch (node.type) {
    case 'paragraph':
      return convertInlineContent(node.content) + '\n\n'

    case 'heading': {
      const level = node.attrs?.level || 1
      const prefix = '#'.repeat(level)
      return `${prefix} ${convertInlineContent(node.content)}\n\n`
    }

    case 'bulletList':
      return convertList(node, '- ') + '\n'

    case 'orderedList':
      return convertOrderedList(node) + '\n'

    case 'listItem':
      return convertInlineContent(node.content?.[0]?.content) + convertNestedBlocks(node)

    case 'taskList':
      return convertTaskList(node) + '\n'

    case 'taskItem': {
      const checked = node.attrs?.checked ? 'x' : ' '
      const text = convertInlineContent(node.content?.[0]?.content)
      return `- [${checked}] ${text}\n`
    }

    case 'blockquote':
      return convertBlockquote(node) + '\n'

    case 'codeBlock': {
      const lang = node.attrs?.language || ''
      const code = getTextContent(node)
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`
    }

    case 'horizontalRule':
      return '---\n\n'

    case 'pageBreak':
      return '[========]\n\n'

    case 'hardBreak':
      return '  \n'

    case 'image': {
      const src = node.attrs?.src || ''
      const alt = node.attrs?.alt || ''
      const title = node.attrs?.title ? ` "${node.attrs.title}"` : ''
      return `![${alt}](${src}${title})\n\n`
    }

    case 'table':
      return convertTable(node) + '\n'

    case 'admonition':
      return convertAdmonition(node) + '\n'

    case 'mathBlock': {
      const latex = node.attrs?.latex || ''
      return `$$\n${latex}\n$$\n\n`
    }

    case 'mathInline': {
      const latex = node.attrs?.latex || ''
      return `$${latex}$`
    }

    case 'mention': {
      const label = node.attrs?.label || node.attrs?.id || ''
      return `@${label}`
    }

    case 'text':
      return convertText(node)

    default:
      // For unknown nodes, try to extract text content
      if (node.content) {
        return convertNodes(node.content)
      }
      return node.text || ''
  }
}

function convertText(node: TiptapNode): string {
  let text = node.text || ''
  if (!node.marks) return text

  for (const mark of node.marks) {
    switch (mark.type) {
      case 'bold':
        text = `**${text}**`
        break
      case 'italic':
        text = `*${text}*`
        break
      case 'strike':
        text = `~~${text}~~`
        break
      case 'code':
        text = `\`${text}\``
        break
      case 'link': {
        const href = mark.attrs?.href || ''
        text = `[${text}](${href})`
        break
      }
    }
  }
  return text
}

function convertInlineContent(nodes?: TiptapNode[]): string {
  if (!nodes) return ''
  return nodes.map((n, i) => convertNode(n, i, nodes)).join('')
}

function convertList(node: TiptapNode, prefix: string): string {
  if (!node.content) return ''
  return node.content
    .map(item => {
      const firstPara = convertInlineContent(item.content?.[0]?.content)
      const nested = convertNestedBlocks(item)
      return `${prefix}${firstPara}${nested}`
    })
    .join('\n') + '\n'
}

function convertOrderedList(node: TiptapNode): string {
  if (!node.content) return ''
  return node.content
    .map((item, i) => {
      const firstPara = convertInlineContent(item.content?.[0]?.content)
      const nested = convertNestedBlocks(item)
      return `${i + 1}. ${firstPara}${nested}`
    })
    .join('\n') + '\n'
}

function convertNestedBlocks(listItem: TiptapNode): string {
  if (!listItem.content || listItem.content.length <= 1) return ''
  // Process nested lists with indentation
  let result = ''
  for (let i = 1; i < listItem.content.length; i++) {
    const child = listItem.content[i]
    const childMd = convertNode(child, i, listItem.content)
    result += '\n' + childMd.split('\n').map(line => line ? '  ' + line : '').join('\n')
  }
  return result
}

function convertTaskList(node: TiptapNode): string {
  if (!node.content) return ''
  return node.content.map((item, i) => convertNode(item, i, node.content!)).join('')
}

function convertBlockquote(node: TiptapNode): string {
  if (!node.content) return ''
  const inner = convertNodes(node.content).trimEnd()
  return inner.split('\n').map(line => `> ${line}`).join('\n') + '\n'
}

function convertTable(node: TiptapNode): string {
  if (!node.content) return ''

  const rows = node.content.filter(r => r.type === 'tableRow')
  if (rows.length === 0) return ''

  const result: string[] = []

  // First row (header)
  const headerRow = rows[0]
  const headerCells = (headerRow.content || []).map(cell =>
    convertInlineContent(cell.content?.[0]?.content).trim()
  )
  result.push('| ' + headerCells.join(' | ') + ' |')
  result.push('| ' + headerCells.map(() => '---').join(' | ') + ' |')

  // Body rows
  for (let i = 1; i < rows.length; i++) {
    const cells = (rows[i].content || []).map(cell =>
      convertInlineContent(cell.content?.[0]?.content).trim()
    )
    result.push('| ' + cells.join(' | ') + ' |')
  }

  return result.join('\n') + '\n\n'
}

function convertAdmonition(node: TiptapNode): string {
  const type = node.attrs?.type || 'info'
  const title = node.attrs?.title || type.charAt(0).toUpperCase() + type.slice(1)
  const inner = node.content ? convertNodes(node.content).trimEnd() : ''
  // Use GitHub-style blockquote admonition syntax
  return `> [!${type.toUpperCase()}] ${title}\n` +
    inner.split('\n').map(line => `> ${line}`).join('\n') + '\n'
}

function getTextContent(node: TiptapNode): string {
  if (node.text) return node.text
  if (!node.content) return ''
  return node.content.map(getTextContent).join('')
}
