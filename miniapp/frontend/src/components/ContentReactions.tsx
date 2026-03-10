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
  /** компактный вид (только счётчики под датой); иначе полный блок "Как вам статья?" */
  compact?: boolean
  /** показывать кнопку дизлайка только в полном блоке */
  showDislike?: boolean
}

const LikeIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)
const ClapIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)
const DislikeIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2zm7-13h2.72a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-2l-2 4v-4l-2-4h4V2z" />
  </svg>
)

export default function ContentReactions({
  contentId: _contentId,
  userId,
  likes,
  claps,
  dislikes,
  userReaction,
  onReaction,
  loading = false,
  compact,
  showDislike = false
}: Props) {
  const handleClick = (reaction: ContentReaction) => {
    if (!userId) return
    onReaction(reaction)
  }

  const btn = (reaction: ContentReaction, count: number, userActive: number, Icon: React.FC<{ active?: boolean }>, label: string) => (
    <button
      type="button"
      disabled={!userId || loading}
      onClick={() => handleClick(reaction)}
      className="flex items-center gap-1.5 text-text-secondary hover:text-accent disabled:opacity-50 disabled:pointer-events-none transition-colors"
      aria-label={label}
    >
      <Icon active={userActive > 0} />
      <span className="text-[14px]">{count}</span>
    </button>
  )

  if (compact) {
    return (
      <div className="flex items-center gap-4 text-text-secondary">
        {btn('like', likes, userReaction.like, LikeIcon, 'Нравится')}
        {btn('clap', claps, userReaction.clap, ClapIcon, 'Класс')}
      </div>
    )
  }

  return (
    <div className="border-t border-border-light pt-4 mt-4">
      <p className="text-[14px] text-text-secondary mb-3">Как вам статья?</p>
      <div className="flex items-center gap-6">
        {btn('like', likes, userReaction.like, LikeIcon, 'Нравится')}
        {btn('clap', claps, userReaction.clap, ClapIcon, 'Класс')}
        {showDislike && btn('dislike', dislikes, userReaction.dislike, DislikeIcon, 'Не нравится')}
      </div>
    </div>
  )
}
