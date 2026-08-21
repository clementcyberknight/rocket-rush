import { useState } from 'react'
import { useStore } from '../../state/useStore'
import { leaderboardService } from '../../services/leaderboardService'
import '../../styles/gameMenu.css'

export default function MultiplayerMenu({ onClose }) {
  const [joinCode, setJoinCode] = useState('')
  const roomCode = useStore(s => s.roomCode)
  const roomPlayers = useStore(s => s.roomPlayers)
  const isRoomHost = useStore(s => s.isRoomHost)
  const roomStatus = useStore(s => s.roomStatus)

  const handleCreate = () => {
    leaderboardService.createRoom()
  }

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase()
    if (!code || code.length < 4) return
    leaderboardService.joinRoom(code)
  }

  const handleStart = () => {
    leaderboardService.startRoom()
  }

  const handleLeave = () => {
    leaderboardService.leaveRoom()
    useStore.getState().setRoomCode(null)
    useStore.getState().setRoomPlayers([])
    useStore.getState().setRoomStatus(null)
    useStore.getState().setIsRoomHost(false)
    useStore.getState().setRoomSeed(null)
    onClose()
  }

  // LOBBY STATE
  if (roomCode && roomStatus === 'lobby') {
    return (
      <div className="multiplayer__container-inner">
        <div className="multiplayer__header">
          <h2 className="game__score-title" style={{ fontSize: '1.5rem', margin: 0, color: '#00f0ff', textShadow: '0 0 20px #00f0ff' }}>
            ROOM LOBBY
          </h2>
          <span className="multiplayer__live-badge">
            <span className="multiplayer__pulse-dot"></span> CODE: <strong>{roomCode}</strong>
          </span>
        </div>

        <div className="multiplayer__players-list">
          <div className="multiplayer__players-title-row">
            <span>PILOTS IN LOBBY ({roomPlayers.length}/10)</span>
          </div>
          {roomPlayers.length === 0 ? (
            <div className="multiplayer__empty">
              <p className="multiplayer__empty-title">WAITING FOR PILOTS...</p>
              <p className="multiplayer__empty-sub">Share room code {roomCode} with your friends!</p>
            </div>
          ) : (
            roomPlayers.map((p, idx) => (
              <div key={p.uid || idx} className="multiplayer__player-item">
                <span className="multiplayer__player-name">
                  #{idx + 1} {p.username || 'ANONYMOUS'}
                </span>
                {p.isHost && <span className="multiplayer__host-badge">HOST</span>}
              </div>
            ))
          )}
        </div>

        <div className="multiplayer__actions-row">
          {isRoomHost && (
            <button onClick={handleStart} className="multiplayer__btn-action multiplayer__btn-start">
              START GAME 🚀
            </button>
          )}
          <button onClick={handleLeave} className="multiplayer__btn-action multiplayer__btn-leave">
            LEAVE ROOM
          </button>
        </div>
      </div>
    )
  }

  // COUNTDOWN STATE
  if (roomCode && roomStatus === 'countdown') {
    return (
      <div className="multiplayer__container-inner">
        <div className="multiplayer__header">
          <h2 className="game__score-title" style={{ fontSize: '1.5rem', margin: 0, color: '#00f0ff', textShadow: '0 0 20px #00f0ff' }}>
            LAUNCH SEQUENCE
          </h2>
          <span className="multiplayer__live-badge">
            <span className="multiplayer__pulse-dot"></span> STARTING
          </span>
        </div>
        <div className="multiplayer__empty" style={{ padding: '1.8rem 1rem' }}>
          <p className="multiplayer__empty-title" style={{ fontSize: '1.3rem' }}>GET READY TO FLY!</p>
          <p className="multiplayer__empty-sub">Game starting in 3... 2... 1...</p>
        </div>
      </div>
    )
  }

  // MAIN MULTIPLAYER MENU (CREATE OR JOIN)
  return (
    <div className="multiplayer__container-inner">
      <div className="multiplayer__header">
        <h2 className="game__score-title" style={{ fontSize: '1.5rem', margin: 0, color: '#00f0ff', textShadow: '0 0 20px #00f0ff' }}>
          PLAY WITH FRIENDS
        </h2>
        <span className="multiplayer__live-badge">
          <span className="multiplayer__pulse-dot"></span> LIVE LOBBY
        </span>
      </div>

      <div className="multiplayer__body">
        {/* Create Room Box */}
        <div className="multiplayer__box">
          <button onClick={handleCreate} className="multiplayer__btn-action multiplayer__btn-create">
            CREATE PRIVATE ROOM
          </button>
          <span className="multiplayer__hint">HOST A MATCH AND INVITE UP TO 10 PILOTS</span>
        </div>

        <div className="multiplayer__divider">
          <span>─── OR ENTER ROOM CODE ───</span>
        </div>

        {/* Join Room Box */}
        <div className="multiplayer__box">
          <div className="multiplayer__join-wrap">
            <input
              type="text"
              className="multiplayer__code-input"
              value={joinCode}
              onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ROOM CODE..."
              maxLength={6}
            />
            <button
              onClick={handleJoin}
              className="multiplayer__btn-action multiplayer__btn-join"
              disabled={joinCode.length < 4}
            >
              JOIN
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
