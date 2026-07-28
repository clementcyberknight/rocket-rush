import { useState, useEffect } from 'react'

import '../../styles/gameMenu.css'
import { useStore } from '../../state/useStore'
import AnimatedLeaderboard from './AnimatedLeaderboard'

const GameOverScreen = () => {
  const [shown, setShown] = useState(false)
  const [opaque, setOpaque] = useState(false)

  const gameOver = useStore(s => s.gameOver)
  const score = useStore(s => s.score)
  const restartGame = useStore(s => s.restartGame)
  const userHighScore = useStore(s => s.userHighScore)
  const userRank = useStore(s => s.userRank)

  const currentScore = Math.floor(score)
  const highScore = Math.floor(userHighScore)
  const isNewBest = currentScore > 0 && currentScore >= highScore

  useEffect(() => {
    let t
    if (gameOver !== opaque) t = setTimeout(() => setOpaque(gameOver), 500)
    return () => clearTimeout(t)
  }, [gameOver, opaque])

  useEffect(() => {
    if (gameOver) {
      setShown(true)
    } else {
      setShown(false)
    }
  }, [gameOver])

  const handleRestart = () => {
    restartGame()
  }

  return shown ? (
    <div className="game__container" style={{ opacity: shown ? 1 : 0, background: opaque ? '#141622FF' : '#141622CC' }}>
      <div className="game__menu">
        <h1 className="game__score-gameover">GAME OVER</h1>
        <div className="game__scorecontainer">
          <div className="game__score-left">
            <h1 className="game__score-title">RUN SCORE</h1>
            <h1 className="game__score">{currentScore}</h1>

            {isNewBest ? (
              <div className="game__new-best-badge">
                <span>🏆 NEW PERSONAL BEST!</span>
              </div>
            ) : (
              highScore > 0 && (
                <div className="game__best-score-box">
                  <span className="game__best-score-label">BEST SCORE: <strong>{highScore}</strong></span>
                </div>
              )
            )}

            {userRank > 0 && (
              <div className="game__user-rank-box">
                <span className="game__user-rank-label">BEST RANK: #{userRank}</span>
              </div>
            )}
          </div>
          <div className="game__score-right">
            <AnimatedLeaderboard limit={20} compact={true} />
          </div>
        </div>
        <button onClick={handleRestart} className="game__menu-button">PLAY AGAIN</button>
      </div>
    </div>
  ) : null
}

export default GameOverScreen
