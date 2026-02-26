import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  snapHeight?: string // например '80vh'
}

// нижний шит (drawer) с анимацией — используется в выборе бренда/линейки/модели
export default function BottomSheet({ open, onClose, title, children, snapHeight = '75vh' }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  // закрытие по клавише Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // блокировка прокрутки body при открытом шите
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* затемнение */}
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/40 transition-opacity duration-200"
        onClick={onClose}
      />

      {/* шит */}
      <div
        className="relative bg-white rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: snapHeight }}
      >
        {/* индикатор свайпа */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        {title && (
          <div className="px-5 pt-2 pb-3 border-b border-border-light">
            <h3 className="text-[18px] font-semibold text-text-primary">{title}</h3>
          </div>
        )}

        <div className="overflow-y-auto flex-1 pb-safe">
          {children}
        </div>
      </div>
    </div>
  )
}
