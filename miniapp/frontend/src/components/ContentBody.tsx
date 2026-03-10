import React from 'react'

/** разбивает текст на параграфы и применяет простую разметку: **жирный**, # заголовок, - список */
function formatTextBlock(text: string): React.ReactNode {
  if (!text.trim()) return null
  const lines = text.split(/\n/)
  const out: React.ReactNode[] = []
  let listItems: string[] = []
  const flushList = () => {
    if (listItems.length > 0) {
      out.push(
        <ul key={out.length} className="list-disc list-inside text-text-secondary text-[14px] leading-relaxed my-2 space-y-1">
          {listItems.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </ul>
      )
      listItems = []
    }
  }
  const formatInline = (s: string) => {
    const parts: React.ReactNode[] = []
    let rest = s
    let key = 0
    while (rest.length > 0) {
      const bold = rest.match(/\*\*(.+?)\*\*/)
      if (bold) {
        const idx = rest.indexOf(bold[0])
        if (idx > 0) parts.push(<React.Fragment key={key++}>{rest.slice(0, idx)}</React.Fragment>)
        parts.push(<strong key={key++} className="font-semibold">{bold[1]}</strong>)
        rest = rest.slice(idx + bold[0].length)
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
      out.push(<h2 key={out.length} className="text-[18px] font-bold text-text-primary mt-4 mb-2">{formatInline(t.slice(3))}</h2>)
    } else if (t.startsWith('# ')) {
      flushList()
      out.push(<h1 key={out.length} className="text-[20px] font-bold text-text-primary mt-4 mb-2">{formatInline(t.slice(2))}</h1>)
    } else if (t.startsWith('- ')) {
      listItems.push(t.slice(2))
    } else if (t.length > 0) {
      flushList()
      out.push(<p key={out.length} className="text-text-secondary text-[14px] leading-relaxed my-2">{formatInline(t)}</p>)
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
          <figure key={i} className="my-4 rounded-card overflow-hidden">
            <img src={src} alt="" className="w-full aspect-video object-cover" />
          </figure>
        )
      }
    } else {
      nodes.push(<React.Fragment key={i}>{formatTextBlock(segment)}</React.Fragment>)
    }
  })
  return <div className="content-body">{nodes}</div>
}
