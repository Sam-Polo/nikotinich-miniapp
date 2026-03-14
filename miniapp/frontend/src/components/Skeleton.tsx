// скелетоны для состояний загрузки

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[8px] bg-[#E8E8E8] animate-pulse ${className}`}
      aria-hidden
    />
  )
}

// список брендов (одна колонка, карточка с картинкой и названием)
export function BrandListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card-bg rounded-card overflow-hidden p-4 flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-[10px] flex-shrink-0" />
          <Skeleton className="h-5 flex-1 max-w-[180px] rounded" />
        </div>
      ))}
    </div>
  )
}

// список линеек (как бренды)
export function LineListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card-bg rounded-card overflow-hidden p-4 flex items-center gap-4">
          <Skeleton className="w-16 h-16 rounded-[10px] flex-shrink-0" />
          <Skeleton className="h-5 flex-1 max-w-[180px] rounded" />
        </div>
      ))}
    </div>
  )
}

// сетка категорий каталога (2 колонки)
export function CatalogGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-card overflow-hidden bg-card-bg flex flex-col">
          <Skeleton className="aspect-square w-full rounded-card rounded-b-none" />
          <div className="px-3 py-2.5 flex items-center justify-center min-h-[40px]">
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// карточки списка новостей: горизонтальная лента сверху + вертикальная лента (как в разделе Новости)
export function NewsListSkeleton() {
  return (
    <>
      {/* горизонтальная лента — размер как у реальных карточек: 170×148px, rounded-card, p-4 */}
      <div className="mb-5">
        <div className="flex gap-3 px-4 overflow-hidden pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[170px] h-[148px] rounded-card p-4 flex flex-col justify-between bg-[#007AFF]/15 animate-pulse"
            >
              <div className="rounded-[8px] bg-[#007AFF]/25 h-5 w-3/4 mb-2" />
              <div className="rounded-[8px] bg-[#007AFF]/20 h-3 w-full mb-1" />
              <div className="rounded-[8px] bg-[#007AFF]/25 h-3 w-2/3 mt-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* основная лента — карточки с картинкой сверху */}
      <div className="px-4 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card-bg rounded-card overflow-hidden shadow-sm">
            <Skeleton className="w-full aspect-video rounded-t-card rounded-b-none" />
            <div className="p-4">
              <Skeleton className="h-5 w-2/3 rounded mb-2" />
              <Skeleton className="h-3 w-1/2 rounded mb-2" />
              <Skeleton className="h-3 w-full rounded mb-1" />
              <Skeleton className="h-3 w-full rounded mb-1" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

// блок деталей заказа / контента
export function ContentBlockSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-full max-w-[200px] rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-4/5 rounded" />
      <Skeleton className="h-20 w-full rounded-[18px]" />
    </div>
  )
}

// страница деталей заказа: заголовок, адрес, состав
export function OrderDetailsSkeleton() {
  return (
    <div className="flex-1 px-4 pt-4 pb-24 animate-step-in" style={{ ['--stagger-i' as string]: '0ms' }}>
      <Skeleton className="h-7 w-1/2 rounded mb-6" />
      <div className="bg-[#F8F8F8] rounded-[18px] p-4 space-y-3 mb-4">
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-3/4 rounded" />
      </div>
      <div className="bg-[#F8F8F8] rounded-[18px] p-4 space-y-3">
        <Skeleton className="h-4 w-1/3 rounded mb-2" />
        <Skeleton className="h-14 w-full rounded" />
        <Skeleton className="h-14 w-full rounded" />
      </div>
    </div>
  )
}

// страница новости/подборки: заголовок, обложка, текст
export function ContentDetailSkeleton() {
  return (
    <div className="flex-1 pt-4 pb-24">
      <article className="w-full">
        <div className="px-5 pb-4">
          <Skeleton className="h-8 w-4/5 rounded mb-4" />
          <Skeleton className="h-4 w-1/3 rounded mb-4" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-full" />
          </div>
        </div>
        <Skeleton className="w-full aspect-video max-h-[320px] rounded-none" />
        <div className="px-5 pt-4 space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-4/5 rounded" />
        </div>
      </article>
    </div>
  )
}

// список карточек заказов в профиле
export function OrderListSkeleton() {
  return (
    <div className="mt-4 space-y-5">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-[#F8F8F8] rounded-[18px] p-[18px]">
          <Skeleton className="h-4 w-1/2 rounded mb-2" />
          <Skeleton className="h-3 w-3/4 rounded mb-3" />
          <div className="flex gap-2">
            <Skeleton className="w-[50px] h-[50px] rounded-[8px]" />
            <Skeleton className="w-[50px] h-[50px] rounded-[8px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

// скелетон контента внутри bottom sheet карточки товара (блок изображения + текст)
export function ProductSheetSkeleton() {
  return (
    <>
      <div className="bg-[#F8F8F8]">
        <Skeleton className="h-[310px] w-full rounded-none" />
      </div>
      <div className="px-4 pt-6 animate-step-in" style={{ ['--stagger-i' as string]: '0ms' }}>
        <div className="space-y-3 mb-5">
          <Skeleton className="h-6 w-4/5 rounded" />
          <Skeleton className="h-7 w-1/3 rounded" />
        </div>
        <div className="space-y-2 mb-5">
          <Skeleton className="h-4 w-1/4 rounded" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-[34px] w-20 rounded-full" />
            <Skeleton className="h-[34px] w-24 rounded-full" />
            <Skeleton className="h-[34px] w-20 rounded-full" />
          </div>
        </div>
        <div className="space-y-2 mb-5">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="flex flex-wrap gap-1">
            <Skeleton className="h-[34px] w-28 rounded-full" />
            <Skeleton className="h-[34px] w-24 rounded-full" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
      </div>
    </>
  )
}

// сетка товаров категории (2 колонки)
export function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-card overflow-hidden bg-card-bg flex flex-col">
          <Skeleton className="aspect-square w-full rounded-card rounded-b-none" />
          <div className="p-3 flex flex-col min-h-[120px] gap-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
            <Skeleton className="h-5 w-1/3 rounded mt-1" />
          </div>
        </div>
      ))}
    </div>
  )
}
