type Size = 'lg' | 'md' | 'sm'

type Props = {
  value: number
  size?: Size
  className?: string
}

const NUM_CLASSES_BY_SIZE: Record<Size, string> = {
  lg: 'text-[28px] font-extrabold leading-[1.1]',
  md: 'text-[22px] font-extrabold leading-[1.1]',
  sm: 'text-[15px] font-extrabold leading-[1.1]'
}

const RUB_CLASSES_BY_SIZE: Record<Size, string> = {
  lg: 'ml-1 text-[18px] font-semibold leading-[1.1]',
  md: 'ml-1 text-[14px] font-semibold leading-[1.1]',
  sm: 'ml-1 text-[12px] font-semibold leading-[1.1]'
}

export default function Price({ value, size = 'lg', className = '' }: Props) {
  const safe = Number.isFinite(value) ? value : 0
  const num = safe.toLocaleString('ru-RU')

  const numClasses = NUM_CLASSES_BY_SIZE[size]
  const rubClasses = RUB_CLASSES_BY_SIZE[size]

  return (
    <span className={['inline-flex items-baseline', className].filter(Boolean).join(' ')}>
      <span className={numClasses}>{num}</span>
      <span className={rubClasses}>₽</span>
    </span>
  )
}

