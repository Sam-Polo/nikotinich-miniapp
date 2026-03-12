// список выбора с иконкой и названием (бренды, линейки, модели по дизайну Figma)
type Item = {
  key: string
  title: string
  image?: string
}

type Props = {
  items: Item[]
  selected: string | null
  onSelect: (key: string) => void
  layout?: 'list' | 'grid'
}

export default function SelectionList({ items, selected, onSelect, layout = 'list' }: Props) {
  if (layout === 'grid') {
    return (
      <div className="grid grid-cols-3 gap-3 p-4">
        {items.map(item => {
          const isSelected = selected === item.key
          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.key)}
              className={[
                'flex flex-col items-center gap-2 p-3 rounded-card transition-all',
                isSelected
                  ? 'border-2 border-accent bg-blue-50'
                  : 'border-2 border-transparent bg-[#F8F8F8] hover:border-gray-200'
              ].join(' ')}
            >
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-full aspect-square object-contain rounded-xl mix-blend-multiply" />
              ) : (
                <div className="w-full aspect-square bg-[#F8F8F8] rounded-xl flex items-center justify-center text-[11px] text-text-secondary">
                  Нет фото
                </div>
              )}
              <span className="text-[11px] font-medium text-text-primary text-center leading-tight">
                {item.title}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  // list layout (как в дизайне для выбора бренда)
  return (
    <div className="divide-y divide-border-light">
      {items.map(item => {
        const isSelected = selected === item.key
        return (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            className={[
              'w-full flex items-center gap-4 px-5 py-3 transition-colors',
              isSelected ? 'bg-blue-50' : 'hover:bg-bg-base active:bg-bg-base'
            ].join(' ')}
          >
            {/* логотип/иконка */}
            <div className={[
              'w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0 bg-[#F8F8F8]',
              isSelected ? 'border-2 border-accent' : 'border-2 border-transparent'
            ].join(' ')}>
              {item.image ? (
                <img src={item.image} alt={item.title} className="w-10 h-10 object-contain mix-blend-multiply" />
              ) : (
                <span className="text-[10px] text-text-secondary">Нет фото</span>
              )}
            </div>
            <span className="text-[16px] font-medium text-text-primary">{item.title}</span>
            {isSelected && (
              <svg className="ml-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        )
      })}
    </div>
  )
}
