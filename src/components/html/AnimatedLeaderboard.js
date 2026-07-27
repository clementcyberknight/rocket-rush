import { useEffect, useRef, useState } from 'react'
import { useStore } from '../../state/useStore'
import '../../styles/gameMenu.css'

export default function AnimatedLeaderboard({ limit = 5, compact = false }) {
  const leaderboard = useStore(s => s.leaderboard) || []
  const userRank = useStore(s => s.userRank)
  const prevRanksRef = useRef(new Map())
  const [climbingWallets, setClimbingWallets] = useState(new Set())
  const [rankDeltas, setRankDeltas] = useState(new Map())

  useEffect(() => {
    if (!leaderboard.length) return

    const newClimbing = new Set()
    const newDeltas = new Map()
    const currentRanks = new Map()

    leaderboard.forEach(entry => {
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
  }, [leaderboard])

  const shortAddr = (addr) => (addr && addr.length > 8 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : (addr || 'Anonymous'))

  return (
    <div className={`leaderboard__container ${compact ? 'leaderboard__compact' : ''}`}>
      <div className="leaderboard__header">
        <h2 className="game__score-title" style={{ fontSize: compact ? '1.5rem' : '2.2rem', margin: 0 }}>
          WEEKLY LEADERBOARD
        </h2>
        <span className="leaderboard__live-badge">
          <span className="leaderboard__pulse-dot"></span> LIVE REDIS STREAM
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
                <span className="leaderboard__wallet">{shortAddr(entry.wallet)}</span>
                <span className="leaderboard__score">{entry.score.toFixed(0)}</span>
              </div>
            )
          })
        ) : (
          <div className="leaderboard__empty">
            <span>No scores recorded yet</span>
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
