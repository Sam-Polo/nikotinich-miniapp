export function formatPriceRub(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return '0 ₽'
  return `${value.toLocaleString('ru-RU')} ₽`
}

