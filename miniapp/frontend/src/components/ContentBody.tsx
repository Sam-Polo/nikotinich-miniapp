import React from 'react'

/** разбивает текст на параграфы: **жирный**, *наклонный*, # заголовок, - или 1. список */
function formatTextBlock(text: string): React.ReactNode {
  if (!text.trim()) return null
  const lines = text.split(/\n/)
  const out: React.ReactNode[] = []
  let listItems: string[] = []
  let listOrdered = false
  const flushList = () => {
    if (listItems.length > 0) {
      const ListTag = listOrdered ? 'ol' : 'ul'
      out.push(
        <ListTag
          key={out.length}
          className={listOrdered ? 'list-decimal list-inside text-[16px] leading-[140%] text-[#4D4D4D] my-2 space-y-1' : 'list-none text-[16px] leading-[140%] text-[#4D4D4D] my-2 space-y-1 pl-0'}
        >
          {listItems.map((item, i) => (
            <li key={i}>
              {listOrdered ? null : '— '}
              {formatInline(item)}
            </li>
          ))}
        </ListTag>
      )
      listItems = []
    }
  }
  const formatInline = (s: string) => {
    const parts: React.ReactNode[] = []
    let rest = s
    let key = 0
    while (rest.length > 0) {
      // ссылка [текст](url) — раньше bold/italic, чтобы внутри ссылки работало форматирование
      const link = rest.match(/\[([^\]]*)\]\(([^)]*)\)/)
      const bold = rest.match(/\*\*(.+?)\*\*/)
      const italic = !bold && rest.match(/\*([^*]+)\*/)
      if (link) {
        const idx = rest.indexOf(link[0])
        if (idx > 0) parts.push(<React.Fragment key={key++}>{formatInline(rest.slice(0, idx))}</React.Fragment>)
        const url = link[2].trim()
        parts.push(
          <a key={key++} href={url} target="_blank" rel="noopener noreferrer" className="text-accent">
            {formatInline(link[1])}
          </a>
        )
        rest = rest.slice(idx + link[0].length)
        continue
      }
      if (bold) {
        const idx = rest.indexOf(bold[0])
        if (idx > 0) parts.push(<React.Fragment key={key++}>{formatInline(rest.slice(0, idx))}</React.Fragment>)
        parts.push(<strong key={key++} className="font-semibold">{formatInline(bold[1])}</strong>)
        rest = rest.slice(idx + bold[0].length)
        continue
      }
      if (italic) {
        const idx = rest.indexOf(italic[0])
        if (idx > 0) parts.push(<React.Fragment key={key++}>{formatInline(rest.slice(0, idx))}</React.Fragment>)
        parts.push(<em key={key++} className="italic">{italic[1]}</em>)
        rest = rest.slice(idx + italic[0].length)
        continue
      }
      parts.push(<React.Fragment key={key++}>{rest}</React.Fragment>)
      break
    }
    return <>{parts}</>
  }
  for (const line of lines) {
    const t = line.trim()
    if (t.startsWith('## ')) {
      flushList()
      out.push(<h2 key={out.length} className="text-[20px] font-semibold leading-[120%] text-[#343434] mt-4 mb-2">{formatInline(t.slice(3))}</h2>)
    } else if (t.startsWith('# ')) {
      flushList()
      out.push(<h1 key={out.length} className="text-[20px] font-semibold leading-[120%] text-[#343434] mt-4 mb-2">{formatInline(t.slice(2))}</h1>)
    } else if (/^\d+\.\s/.test(t)) {
      if (!listOrdered && listItems.length > 0) flushList()
      listOrdered = true
      listItems.push(t.replace(/^\d+\.\s*/, ''))
    } else if (t.startsWith('- ')) {
      if (listOrdered) flushList()
      listOrdered = false
      listItems.push(t.slice(2))
    } else if (t.length > 0) {
      flushList()
      out.push(<p key={out.length} className="text-[16px] leading-[140%] text-[#4D4D4D] my-2">{formatInline(t)}</p>)
    } else {
      flushList()
      out.push(<br key={out.length} />)
    }
  }
  flushList()
  return <>{out}</>
}

type Props = {
  body: string
  images?: string[]
}

/** рендер тела статьи: маркеры {{img1}}, {{img2}} заменяются на фото; остальной текст — простая разметка */
export default function ContentBody({ body, images = [] }: Props) {
  if (!body || !body.trim()) return null
  const parts = body.split(/(\{\{img\d+\}\})/gi)
  const nodes: React.ReactNode[] = []
  parts.forEach((segment, i) => {
    const match = segment.match(/\{\{img(\d+)\}\}/i)
    if (match) {
      const num = parseInt(match[1], 10)
      const src = images[num - 1]
      if (src) {
        nodes.push(
          <figure key={i} className="my-4 -mx-4">
            <img src={src} alt="" className="w-full aspect-video object-cover block" />
          </figure>
        )
      }
    } else {
      nodes.push(<React.Fragment key={i}>{formatTextBlock(segment)}</React.Fragment>)
    }
  })
  return <div className="content-body">{nodes}</div>
}
