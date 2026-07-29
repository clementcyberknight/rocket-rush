import { useState, useEffect } from 'react'

import '../../styles/gameMenu.css'
import { useStore } from '../../state/useStore'
import AnimatedLeaderboard from './AnimatedLeaderboard'

const GameOverScreen = () => {
  const [shown, setShown] = useState(false)
  const [opaque, setOpaque] = useState(false)

  const gameOver = useStore(s => s.gameOver)
  const isSpectating = useStore(s => s.isSpectating)
  const score = useStore(s => s.score)
  const restartGame = useStore(s => s.restartGame)
  const userHighScore = useStore(s => s.userHighScore)
  const userRank = useStore(s => s.userRank)
  const leaderboardVersion = useStore(s => s.leaderboardVersion)

  const currentScore = Math.floor(score)
  const highScore = Math.floor(userHighScore)
  const isNewBest = currentScore > 0 && currentScore >= highScore

  useEffect(() => {
    let t
    if (gameOver !== opaque) t = setTimeout(() => setOpaque(gameOver), 500)
    return () => clearTimeout(t)
  }, [gameOver, opaque])

  useEffect(() => {
    if (gameOver && !isSpectating && !useStore.getState().roomCode) {
      setShown(true)
    } else {
      setShown(false)
    }
  }, [gameOver, isSpectating])

  const handleRestart = () => {
    restartGame()
  }

  const handleMainMenu = () => {
    useStore.getState().setGameOver(false)
    useStore.getState().setGameStarted(false)
    useStore.getState().setIsSpectating(false)
    useStore.getState().restartGame()
  }

  return shown ? (
    <div className="game__container" style={{ opacity: shown ? 1 : 0, background: opaque ? '#141622FF' : '#141622CC', overflowY: 'auto' }}>
      <div className="game__menu" style={{ padding: '1.5rem 0' }}>
        <h1 className="game__score-gameover" style={{ fontSize: '5rem', marginBottom: '0.5rem' }}>GAME OVER</h1>
        <div className="game__scorecontainer" style={{ margin: '0 0 1rem 0' }}>
          <div className="game__score-left" style={{ margin: 0 }}>
            <h1 className="game__score-title" style={{ fontSize: '2.2rem' }}>RUN SCORE</h1>
            <h1 className="game__score" style={{ fontSize: '5rem' }}>{currentScore}</h1>

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
          <div className="game__score-right" style={{ maxHeight: '35vh' }}>
            <AnimatedLeaderboard limit={10} compact={true} key={`lb-${leaderboardVersion}`} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={handleRestart}
            className="multiplayer__btn multiplayer__btn-start"
            style={{ padding: '0.6rem 2rem', fontSize: '1.2rem' }}
          >
            PLAY AGAIN 🚀
          </button>
          <button
            onClick={handleMainMenu}
            className="multiplayer__btn multiplayer__btn-leave"
            style={{ padding: '0.6rem 2rem', fontSize: '1.2rem' }}
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  ) : null
}

export default GameOverScreen
