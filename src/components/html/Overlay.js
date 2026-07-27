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
  const steeringSensitivity = useStore(s => s.steeringSensitivity)
  const setSteeringSensitivity = useStore(s => s.setSteeringSensitivity)
  const musicMuted = useStore(s => s.musicMuted)
  const toggleMusic = useStore(s => s.toggleMusic)

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [usernameMsg, setUsernameMsg] = useState(null)

  const currentUsername = useStore(s => s.username)
  const walletAddress = useStore(s => s.walletAddress)
  const usernameUpdateResult = useStore(s => s.usernameUpdateResult)

  const { primaryWallet, handleLogOut } = useDynamicContext()

  useEffect(() => {
    if (usernameUpdateResult) {
      setUsernameMsg(usernameUpdateResult.message)
      const timer = setTimeout(() => setUsernameMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [usernameUpdateResult])

  useEffect(() => {
    var guestId = window.localStorage.getItem('rocket_rush_guest_id')
    if (!guestId) {
      guestId = 'user_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36)
      window.localStorage.setItem('rocket_rush_guest_id', guestId)
    }

    var primaryAddress = primaryWallet && primaryWallet.address
    var identifier = primaryAddress || guestId

    const previousWallet = useStore.getState().walletAddress

    useStore.getState().setWalletAddress(identifier)

    if (primaryAddress && previousWallet && previousWallet !== primaryAddress && previousWallet.startsWith('user_')) {
      const { leaderboardService } = require('../../services/leaderboardService')
      leaderboardService.mergeGuestScores(previousWallet, primaryAddress)
    }

    if (primaryAddress && primaryAddress.indexOf('@') !== -1) {
      var derived = primaryAddress.split('@')[0]
      var saved = window.localStorage.getItem('rocket_rush_custom_username')
      if (!saved) {
        useStore.getState().setUsername(derived)
      }
    }
  }, [primaryWallet && primaryWallet.address])

  const handleSaveUsername = (e) => {
    e.preventDefault()
    const clean = nameInput.trim()
    if (clean) {
      const { leaderboardService } = require('../../services/leaderboardService')
      leaderboardService.updateUsername(clean, walletAddress)
    }
    setIsEditingName(false)
  }

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
  const shortAddress = connected ? `${primaryWallet.address.slice(0, 4)}...${primaryWallet.address.slice(-3)}` : null

  return shown ? (
    <div className={`game__container`} style={{ opacity: shown ? 1 : 0, background: opaque ? '#141622FF' : '#141622CC' }}>
      <div className="game__top-right">
        <button onClick={toggleMusic} className="game__music-toggle-btn" title={musicMuted ? 'Unmute Music' : 'Mute Music'}>
          {musicMuted ? '🔇' : '🔊'}
        </button>
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
              <button onClick={handleStart} className="game__menu-button">{'STA>RT'}</button>
              <div className="game__menu-controls">
                <p>CONTROLS</p>
                <span>← a / d →</span>
                <div className="game__sensitivity-container">
                  <span className="game__sensitivity-label">
                    SENSITIVITY: <strong>{steeringSensitivity.toFixed(1)}x</strong>
                  </span>
                  <div className="game__sensitivity-presets">
                    <button onClick={() => setSteeringSensitivity(0.7)} className={`game__sens-btn ${steeringSensitivity === 0.7 ? 'active' : ''}`}>0.7x</button>
                    <button onClick={() => setSteeringSensitivity(1.0)} className={`game__sens-btn ${steeringSensitivity === 1.0 ? 'active' : ''}`}>1.0x</button>
                    <button onClick={() => setSteeringSensitivity(1.5)} className={`game__sens-btn ${steeringSensitivity === 1.5 ? 'active' : ''}`}>1.5x PRO</button>
                    <button onClick={() => setSteeringSensitivity(2.0)} className={`game__sens-btn ${steeringSensitivity === 2.0 ? 'active' : ''}`}>2.0x ULTRA</button>
                  </div>
                </div>
              </div>

              <div className="game__username-container">
                {usernameMsg && (
                  <div className={`game__username-msg ${usernameUpdateResult?.success ? 'success' : 'error'}`}>
                    {usernameMsg}
                  </div>
                )}
                {isEditingName ? (
                  <form className="game__username-form" onSubmit={handleSaveUsername}>
                    <input
                      type="text"
                      className="game__username-input"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="CALLSIGN..."
                      maxLength={16}
                      autoFocus
                    />
                    <button type="submit" className="game__username-save-btn">SAVE 🚀</button>
                    <button type="button" className="game__username-cancel-btn" onClick={() => setIsEditingName(false)}>✕</button>
                  </form>
                ) : (
                  <div className="game__username-display">
                    <span className="game__callsign-label">CALLSIGN:</span>
                    <strong className="game__callsign-name">{currentUsername || 'ANONYMOUS'}</strong>
                    <button onClick={() => { setNameInput(currentUsername || ''); setIsEditingName(true); }} className="game__username-edit-btn">
                      ✏️ EDIT
                    </button>
                  </div>
                )}
              </div>

              <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="game__leaderboard-btn">
                {showLeaderboard ? 'HIDE LEADERBOARD' : '🏆 WEEKLY LEADERBOARD'}
              </button>

              {showLeaderboard && (
                <div className="game__leaderboard-panel">
                  <AnimatedLeaderboard limit={20} compact={true} />
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
