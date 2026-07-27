import { useProgress } from '@react-three/drei'
import { useState, useEffect } from 'react'
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core'

import Loader from './CustomLoader'
import AnimatedLeaderboard from './AnimatedLeaderboard'

import '../../styles/gameMenu.css'

import { useStore } from '../../state/useStore'

const Overlay = () => {
  const [shown, setShown] = useState(true)
  const [opaque, setOpaque] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const { active, progress } = useProgress()

  const gameStarted = useStore(s => s.gameStarted)
  const gameOver = useStore(s => s.gameOver)
  const setGameStarted = useStore(s => s.setGameStarted)

  const { primaryWallet, handleLogOut } = useDynamicContext()

  useEffect(() => {
    useStore.getState().setWalletAddress(primaryWallet?.address || null)
  }, [primaryWallet?.address])

  useEffect(() => {
    if (gameStarted || gameOver) {
      setShown(false)
    } else if (!gameStarted) {
      setShown(true)
    }
  }, [gameStarted, active, gameOver])

  useEffect(() => {
    let t
    if (hasLoaded === opaque) t = setTimeout(() => setOpaque(!hasLoaded), 300)
    return () => clearTimeout(t)
  }, [hasLoaded, opaque])

  useEffect(() => {
    if (progress >= 100) {
      setHasLoaded(true)
    }
  }, [progress])

  const handleStart = () => {
    setGameStarted(true)
  }

  const connected = !!primaryWallet
  const shortAddress = connected ? `${primaryWallet.address.slice(0, 4)}...${primaryWallet.address.slice(-4)}` : null

  return shown ? (
    <div className={`game__container`} style={{ opacity: shown ? 1 : 0, background: opaque ? '#141622FF' : '#141622CC' }}>
      <div className="game__top-right">
        {!connected && <DynamicWidget variant="modal" />}
        {connected && (
          <div className="wallet__connected-box">
            <span className="login__wallet">{shortAddress}</span>
            <button onClick={() => handleLogOut()} className="login__disconnect-btn">
              Disconnect
            </button>
          </div>
        )}
      </div>
      <div className="game__menu">
        <div className="game__subcontainer">
          {!hasLoaded ? (
            <Loader active={active} progress={progress} />
          ) : (
            <div className="game__center-content">
              <img className="game__logo-small" style={{ maxHeight: '180px', width: 'auto', marginBottom: '0.5rem' }} src="/rocketrush-logo.png" alt="Rocket Rush Logo" />
              <button onClick={handleStart} className="game__menu-button">{'STA>RT'}</button>
              <div className="game__menu-controls">
                <p>CONTROLS</p>
                ← a / d →
              </div>

              <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="game__leaderboard-btn">
                {showLeaderboard ? 'HIDE LEADERBOARD' : '🏆 WEEKLY LEADERBOARD'}
              </button>

              {showLeaderboard && (
                <div className="game__leaderboard-panel">
                  <AnimatedLeaderboard limit={5} compact={true} />
                </div>
              )}

              <span className="game__menu-warning">Photosensitivity warning - Game contains flashing lights</span>
            </div>
          )}
        </div>
      </div>
    </div >
  ) : null
}

export default Overlay
