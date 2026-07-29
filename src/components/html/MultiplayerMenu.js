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

  if (roomCode && roomStatus === 'lobby') {
    return (
      <div className="multiplayer__container">
        <div className="multiplayer__card">
          <h2 className="multiplayer__title">ROOM LOBBY</h2>
          <div className="multiplayer__code-box">
            <span className="multiplayer__code-label">ROOM CODE</span>
            <span className="multiplayer__code">{roomCode}</span>
          </div>
          <div className="multiplayer__players">
            <h3>PLAYERS ({roomPlayers.length}/10)</h3>
            {roomPlayers.length === 0 && (
              <p className="multiplayer__empty">Waiting for players...</p>
            )}
            {roomPlayers.map(p => (
              <div key={p.uid} className="multiplayer__player">
                <span>{p.username || 'ANONYMOUS'}</span>
                {p.isHost && <span className="multiplayer__host-badge">HOST</span>}
              </div>
            ))}
          </div>
          <div className="multiplayer__actions">
            {isRoomHost && (
              <button onClick={handleStart} className="multiplayer__btn multiplayer__btn-start">
                START GAME
              </button>
            )}
            <button onClick={handleLeave} className="multiplayer__btn multiplayer__btn-leave">
              LEAVE
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (roomCode && roomStatus === 'countdown') {
    return (
      <div className="multiplayer__container">
        <div className="multiplayer__card">
          <h2 className="multiplayer__title">GET READY!</h2>
          <p className="multiplayer__subtitle">Game starting in 3... 2... 1...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="multiplayer__container">
      <div className="multiplayer__card">
        <h2 className="multiplayer__title">PLAY WITH FRIENDS</h2>
        <div className="multiplayer__section">
          <button onClick={handleCreate} className="multiplayer__btn multiplayer__btn-create">
            CREATE ROOM
          </button>
          <p className="multiplayer__hint">Create a room and share the code</p>
        </div>
        <div className="multiplayer__divider">
          <span>OR</span>
        </div>
        <div className="multiplayer__section">
          <input
            type="text"
            className="multiplayer__input"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
            placeholder="ENTER ROOM CODE"
            maxLength={6}
          />
          <button onClick={handleJoin} className="multiplayer__btn multiplayer__btn-join" disabled={joinCode.length < 4}>
            JOIN ROOM
          </button>
        </div>
        <button onClick={onClose} className="multiplayer__btn multiplayer__btn-back">
          BACK
        </button>
      </div>
    </div>
  )
}
