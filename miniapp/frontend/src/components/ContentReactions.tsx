import type { ContentReaction } from '../api'

export type UserReactionState = { like: number; clap: number; dislike: number }

type Props = {
  contentId: string
  userId: string | undefined
  likes: number
  claps: number
  dislikes: number
  userReaction: UserReactionState
  onReaction: (reaction: ContentReaction) => void
  loading?: boolean
  compact?: boolean
  showDislike?: boolean
}

const EMOJI = { like: '❤️', clap: '👍', dislike: '👎' } as const

export default function ContentReactions({
  contentId: _contentId,
  userId,
  likes,
  claps,
  dislikes,
  userReaction,
  onReaction,
  loading: _loading = false,
  compact,
  showDislike = false
}: Props) {
  const handleClick = (reaction: ContentReaction) => {
    if (!userId) return
    onReaction(reaction)
  }

  const pill = (reaction: ContentReaction, count: number, userActive: number, label: string, showCount: boolean) => (
    <button
      type="button"
      disabled={!userId}
      onClick={() => handleClick(reaction)}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full min-w-[44px] min-h-[36px] px-3 py-1.5 text-[14px] transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none ${
        userActive > 0 ? 'bg-accent text-white' : 'bg-[#E5E5EA] text-text-secondary'
      }`}
      aria-label={label}
    >
      <span className="text-base leading-none">{EMOJI[reaction]}</span>
      {showCount && <span>{count}</span>}
    </button>
  )

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {pill('like', likes, userReaction.like, 'Нравится', true)}
        {pill('clap', claps, userReaction.clap, 'Класс', true)}
      </div>
    )
  }

  return (
    <div className="border-t border-border-light pt-4 mt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[14px] font-semibold text-text-primary">
          Как вам статья?
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {pill('like', likes, userReaction.like, 'Нравится', true)}
          {pill('clap', claps, userReaction.clap, 'Класс', true)}
          {showDislike && pill('dislike', dislikes, userReaction.dislike, 'Не нравится', false)}
        </div>
      </div>
    </div>
  )
}
