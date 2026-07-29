import { useProgress } from '@react-three/drei'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useDynamicContext, DynamicWidget } from '@dynamic-labs/sdk-react-core'

import Loader from './CustomLoader'
import AnimatedLeaderboard from './AnimatedLeaderboard'
import MultiplayerMenu from './MultiplayerMenu'

import '../../styles/gameMenu.css'

import { useStore } from '../../state/useStore'
import { leaderboardService, getGuestId } from '../../services/leaderboardService'

const Overlay = () => {
  const [shown, setShown] = useState(true)
  const [opaque, setOpaque] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showMultiplayer, setShowMultiplayer] = useState(false)
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
  const [isChecking, setIsChecking] = useState(false)
  const debounceRef = useRef(null)

  const currentUsername = useStore(s => s.username)
  const walletAddress = useStore(s => s.walletAddress)
  const usernameUpdateResult = useStore(s => s.usernameUpdateResult)
  const usernameCheckResult = useStore(s => s.usernameCheckResult)
  const leaderboardVersion = useStore(s => s.leaderboardVersion)
  const roomCode = useStore(s => s.roomCode)

  const { primaryWallet, handleLogOut } = useDynamicContext()

  useEffect(() => {
    if (usernameUpdateResult) {
      setUsernameMsg(usernameUpdateResult.message)
      const timer = setTimeout(() => setUsernameMsg(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [usernameUpdateResult])

  useEffect(() => {
    const guestId = getGuestId()
    var primaryAddress = primaryWallet && primaryWallet.address
    var identifier = primaryAddress || guestId

    const previousWallet = useStore.getState().walletAddress

    useStore.getState().setWalletAddress(identifier)

    if (primaryAddress && previousWallet && previousWallet !== primaryAddress && (previousWallet.startsWith('rush_') || previousWallet.startsWith('user_'))) {
      leaderboardService.mergeGuestScores(previousWallet, primaryAddress)
    }

    if (primaryAddress && primaryAddress.indexOf('@') !== -1) {
      var derived = primaryAddress.split('@')[0]
      var saved = window.localStorage.getItem('rocket_rush_custom_username')
      if (!saved) {
        useStore.getState().setUsername(derived)
      } else {
        useStore.getState().setUsername(saved)
      }
    } else {
      var savedName = window.localStorage.getItem('rocket_rush_custom_username')
      if (savedName) {
        useStore.getState().setUsername(savedName)
      }
    }
  }, [primaryWallet && primaryWallet.address])

  const checkUsernameDebounced = useCallback((name) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const clean = name.trim()
    if (!clean || clean.length < 3) {
      useStore.getState().setUsernameCheckResult(false, null)
      setIsChecking(false)
      return
    }
    setIsChecking(true)
    debounceRef.current = setTimeout(() => {
      leaderboardService.checkUsername(clean, walletAddress)
    }, 500)
  }, [walletAddress])

  useEffect(() => {
    if (usernameCheckResult) {
      setIsChecking(false)
    }
  }, [usernameCheckResult])

  const handleSaveUsername = (e) => {
    e.preventDefault()
    const clean = nameInput.trim()
    if (clean && usernameCheckResult?.available) {
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
    if (roomCode) {
      setShowMultiplayer(true)
    }
  }, [roomCode])

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
                    <div className="game__username-input-wrap">
                      <input
                        type="text"
                        className={`game__username-input ${usernameCheckResult ? (usernameCheckResult.available ? 'valid' : 'invalid') : ''}`}
                        value={nameInput}
                        onChange={(e) => {
                          const val = e.target.value.slice(0, 16)
                          setNameInput(val)
                          checkUsernameDebounced(val)
                        }}
                        placeholder="CALLSIGN..."
                        maxLength={16}
                        autoFocus
                      />
                      {isChecking && (
                        <span className="game__username-checking">...</span>
                      )}
                      {!isChecking && usernameCheckResult && usernameCheckResult.available && (
                        <span className="game__username-available">Available</span>
                      )}
                      {!isChecking && usernameCheckResult && !usernameCheckResult.available && usernameCheckResult.error && (
                        <span className="game__username-taken">{usernameCheckResult.error}</span>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="game__username-save-btn"
                      disabled={!usernameCheckResult?.available || isChecking}
                    >
                      SAVE 🚀
                    </button>
                    <button type="button" className="game__username-cancel-btn" onClick={() => { setIsEditingName(false); useStore.getState().setUsernameCheckResult(false, null); }}>✕</button>
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

              <button onClick={() => setShowMultiplayer(!showMultiplayer)} className="game__leaderboard-btn" style={{ borderColor: '#00f0ff', color: '#00f0ff' }}>
                {showMultiplayer ? 'HIDE MULTIPLAYER' : '🎮 PLAY WITH FRIENDS'}
              </button>

              {showMultiplayer && (
                <MultiplayerMenu onClose={() => setShowMultiplayer(false)} />
              )}

              <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="game__leaderboard-btn" style={{ marginTop: '0.4rem' }}>
                {showLeaderboard ? 'HIDE LEADERBOARD' : '🏆 WEEKLY LEADERBOARD'}
              </button>

              {showLeaderboard && (
                <div className="game__leaderboard-panel">
                  <AnimatedLeaderboard limit={20} compact={true} key={`lb-menu-${leaderboardVersion}`} />
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
