// скелетоны для состояний загрузки

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[8px] bg-[#E8E8E8] animate-pulse ${className}`}
      aria-hidden
    />
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
      {/* горизонтальная лента (как topFeedItems) */}
      <div className="mb-5">
        <div className="flex gap-3 px-4 overflow-hidden pb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[170px] rounded-card overflow-hidden bg-[#F0F0F0] flex flex-col p-4">
              <Skeleton className="h-5 w-3/4 rounded mb-2" />
              <Skeleton className="h-3 w-full rounded mb-1" />
              <Skeleton className="h-3 w-2/3 rounded mt-auto" />
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
