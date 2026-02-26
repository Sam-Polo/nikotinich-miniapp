// индикатор загрузки
export default function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex justify-center items-center py-10 ${className}`}>
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
