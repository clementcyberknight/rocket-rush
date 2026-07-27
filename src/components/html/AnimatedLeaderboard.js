import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../state/useStore'
import '../../styles/gameMenu.css'

function formatDisplayName(wallet, username) {
  if (username && typeof username === 'string' && username.trim().length > 0) return username.trim()
  if (!wallet || wallet.toLowerCase() === 'anonymous') return 'ANONYMOUS PILOT'
  if (wallet.includes('@')) return wallet.split('@')[0]
  if (wallet.length <= 10) return wallet
  return `${wallet.slice(0, 4)}...${wallet.slice(-3)}`
}

export default function AnimatedLeaderboard({ limit = 20, compact = false }) {
  const storeLeaderboard = useStore(s => s.leaderboard)
  const leaderboard = storeLeaderboard || []
  const userRank = useStore(s => s.userRank)
  const prevRanksRef = useRef(new Map())
  const [climbingWallets, setClimbingWallets] = useState(new Set())
  const [rankDeltas, setRankDeltas] = useState(new Map())

  useEffect(() => {
    if (!storeLeaderboard || !storeLeaderboard.length) return

    const newClimbing = new Set()
    const newDeltas = new Map()
    const currentRanks = new Map()

    storeLeaderboard.forEach(entry => {
      currentRanks.set(entry.wallet, entry.rank)
      const prevRank = prevRanksRef.current.get(entry.wallet)

      if (prevRank !== undefined && entry.rank < prevRank) {
        // Player climbed up!
        newClimbing.add(entry.wallet)
        newDeltas.set(entry.wallet, prevRank - entry.rank)
      }
    })

    prevRanksRef.current = currentRanks

    if (newClimbing.size > 0) {
      setClimbingWallets(newClimbing)
      setRankDeltas(newDeltas)

      // Clear animation pulse after 2.5 seconds
      const timer = setTimeout(() => {
        setClimbingWallets(new Set())
        setRankDeltas(new Map())
      }, 2500)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeLeaderboard])

  return (
    <div className={`leaderboard__container ${compact ? 'leaderboard__compact' : ''}`}>
      <div className="leaderboard__header">
        <h2 className="game__score-title" style={{ fontSize: compact ? '1.5rem' : '2.2rem', margin: 0 }}>
          WEEKLY LEADERBOARD
        </h2>
        <span className="leaderboard__live-badge">
          <span className="leaderboard__pulse-dot"></span> LIVE LEADERBOARD
        </span>
      </div>

      <div className="leaderboard__list">
        {leaderboard.length > 0 ? (
          leaderboard.slice(0, limit).map((entry) => {
            const isClimbing = climbingWallets.has(entry.wallet)
            const delta = rankDeltas.get(entry.wallet)

            return (
              <div
                key={`${entry.wallet}`}
                className={`leaderboard__item ${isClimbing ? 'leaderboard__item-climbing' : ''} ${entry.rank === 1 ? 'leaderboard__item-gold' : ''}`}
              >
                <div className="leaderboard__rank-box">
                  <span className="leaderboard__rank">#{entry.rank}</span>
                  {isClimbing && delta && (
                    <span className="leaderboard__climb-badge">▲ +{delta}</span>
                  )}
                </div>
                <span className="leaderboard__wallet">{formatDisplayName(entry.wallet, entry.username)}</span>
                <span className="leaderboard__score">{entry.score.toFixed(0)}</span>
              </div>
            )
          })
        ) : (
          <div className="leaderboard__empty">
            <p className="leaderboard__empty-title">NO SCORES RECORDED YET</p>
            <p className="leaderboard__empty-sub">Be the first pilot to set a weekly high score!</p>
          </div>
        )}
      </div>

      {userRank > 0 && (
        <div className="leaderboard__user-rank">
          <span>YOUR WEEKLY RANK: <strong>#{userRank}</strong></span>
        </div>
      )}
    </div>
  )
}
