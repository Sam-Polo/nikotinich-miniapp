// транслитерация русского текста в латиницу для slug
export function transliterate(text: string): string {
  const map: Record<string, string> = {
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
    'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
    'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
    'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
    'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
    'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo',
    'Ж': 'Zh', 'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M',
    'Н': 'N', 'О': 'O', 'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U',
    'Ф': 'F', 'Х': 'H', 'Ц': 'Ts', 'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch',
    'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu', 'Я': 'Ya'
  }

  return text
    .split('')
    .map(char => map[char] || char)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // убираем спецсимволы
    .replace(/\s+/g, '-') // пробелы в дефисы
    .replace(/-+/g, '-') // множественные дефисы в один
    .replace(/^-|-$/g, '') // убираем дефисы в начале и конце
}

// генерация slug из названия и артикула
export function generateSlug(title: string, article: string): string {
  const transliterated = transliterate(title)
  return `${transliterated}-${article}`
}

// парсинг артикула: 1–4 цифры (в таблице Google хранят как число без ведущих нулей: 100, 1 и т.д.)
export function parseArticle(article: string): number | null {
  const s = String(article).trim()
  if (!/^\d{1,4}$/.test(s)) return null
  const num = parseInt(s, 10)
  return num >= 0 && num <= 9999 ? num : null
}

// форматирование артикула в 4 цифры с ведущими нулями
export function formatArticle(num: number): string {
  return String(num).padStart(4, '0')
}

// нормализация артикула к виду "0100" для сравнения и отображения
export function normalizeArticle(article: string | undefined): string | undefined {
  if (article == null || article === '') return undefined
  const num = parseArticle(String(article).trim())
  return num != null ? formatArticle(num) : undefined
}

// нормализация ключа бренда/линейки: нижний регистр, без пробелов
export function normalizeKey(value: string): string {
  return value.replace(/\s/g, '').toLowerCase()
}

// допустимы только латиница, цифры, дефис, подчёркивание
const KEY_REGEX = /^[a-z0-9_-]*$/
export function isValidKey(value: string): boolean {
  return KEY_REGEX.test(value)
}

// недопустимые символы в ключе (для сообщения пользователю)
export function getInvalidKeyChars(value: string): string[] {
  const seen = new Set<string>()
  const lower = value.toLowerCase()
  for (const char of lower) {
    if (!/[a-z0-9_-]/.test(char) && char !== ' ') {
      seen.add(char)
    }
  }
  return Array.from(seen)
}

