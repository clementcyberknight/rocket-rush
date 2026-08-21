import {
  encodeClientMessage,
  encodePlayerMove,
  decodeServerMessage,
  ClientMessageType,
  ServerMessageType
} from '../proto/protoCodec'
import { useStore } from '../state/useStore'

// Shared mutable trajectory cache for 60/120 FPS Three.js GPU dead reckoning without React re-render overhead
export const remotePlayerStates = new Map()

export function getGuestId() {
  let guestId = localStorage.getItem('rocket_rush_guest_id')
  if (!guestId) {
    guestId = `rush_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
    localStorage.setItem('rocket_rush_guest_id', guestId)
  }
  return guestId
}

class LeaderboardService {
  constructor() {
    this.ws = null
    this.sessionId = null
    this.url = process.env.REACT_APP_WS_URL || `ws://${window.location.hostname}:3000`
    this.reconnectTimer = null
  }

  getResolvedUrl() {
    let targetUrl = this.url
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
      targetUrl = targetUrl.replace(/^ws:\/\//i, 'wss://')
    }
    return targetUrl
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return
    }

    try {
      const finalUrl = this.getResolvedUrl()
      this.ws = new WebSocket(finalUrl)
      this.ws.binaryType = 'arraybuffer'

      this.ws.onopen = () => {
        this.getLeaderboard(20)

        const state = useStore.getState()
        if (state.gameStarted && !state.gameOver) {
          this.startSession(state.walletAddress, state.username)
        }

        if (state.roomCode) {
          this.joinRoom(state.roomCode)
        }
      }

      this.ws.onmessage = (event) => {
        const msg = decodeServerMessage(event.data)
        if (!msg) return

        switch (msg.type) {
          case ServerMessageType.SESSION_STARTED:
            this.sessionId = msg.sessionId
            if (msg.uid) {
              useStore.getState().setUid(msg.uid)
            }
            if (msg.ghostPath && msg.ghostPath.length > 0) {
              useStore.getState().setGhostPath(msg.ghostPath, msg.ghostInterval || 250)
            } else {
              useStore.getState().setGhostPath(null, 250)
            }
            useStore.getState().setSessionId(msg.sessionId)
            break

          case ServerMessageType.LEADERBOARD:
            useStore.getState().setLeaderboard(msg.entries, msg.week)
            {
              const state = useStore.getState()
              const uid = state.uid
              const wallet = state.walletAddress || getGuestId()
              const userEntry = msg.entries.find(e => e.wallet === uid || e.wallet === wallet)
              if (userEntry) {
                useStore.getState().setUserRankFromLeaderboard(userEntry.rank, userEntry.score)
                if (userEntry.username) {
                  localStorage.setItem('rocket_rush_custom_username', userEntry.username)
                  useStore.getState().setUsername(userEntry.username)
                }
              }
            }
            break

          case ServerMessageType.SCORE_SUBMITTED:
            useStore.getState().setUserRank(msg.rank, msg.score, msg.valid)
            break

          case ServerMessageType.ERROR:
            console.warn('[Leaderboard] Backend error:', msg.message)
            break

          case ServerMessageType.USERNAME_UPDATED:
            if (msg.success) {
              const confirmedUsername = msg.username || this.pendingUsername
              if (confirmedUsername) {
                localStorage.setItem('rocket_rush_custom_username', confirmedUsername)
                useStore.getState().setUsername(confirmedUsername)
              }
              // Re-fetch leaderboard to ensure username appears
              if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.getLeaderboard(20)
              }
            } else {
              console.warn('[Leaderboard] Username update failed:', msg.message)
              useStore.getState().setUsername(this.previousUsername || null)
            }
            this.pendingUsername = null
            this.previousUsername = null
            useStore.getState().setUsernameUpdateResult(msg.success, msg.message)
            break

          case ServerMessageType.USERNAME_CHECKED:
            useStore.getState().setUsernameCheckResult(msg.available, msg.error)
            break

          case ServerMessageType.ROOM_CREATED: {
            const state = useStore.getState()
            useStore.getState().setRoomCode(msg.code)
            useStore.getState().setRoomSeed(msg.seed)
            useStore.getState().setIsRoomHost(true)
            useStore.getState().setRoomStatus("lobby")
            useStore.getState().setRoomPlayers([{
              uid: state.uid || 'host',
              username: state.username || 'ANONYMOUS',
              isHost: true,
              alive: true,
              x: 0, y: 0, z: 0, score: 0, level: 0
            }])
            break
          }

          case ServerMessageType.ROOM_JOINED: {
            const state = useStore.getState()
            const myUid = state.uid
            const players = msg.players || []
            const meInList = players.find(p => p.uid === myUid)
            
            useStore.getState().setRoomCode(msg.code)
            useStore.getState().setRoomSeed(msg.seed)
            useStore.getState().setRoomStatus("lobby")
            useStore.getState().setRoomPlayers(players.map(p => ({
              uid: p.uid, username: p.username, isHost: p.isHost,
              alive: true, x: 0, y: 0, z: 0, score: 0, level: 0
            })))
            if (meInList && meInList.isHost) {
              useStore.getState().setIsRoomHost(true)
            }
            break
          }

          case ServerMessageType.ROOM_PLAYER_JOINED: {
            const p = useStore.getState().roomPlayers || []
            if (!p.find(x => x.uid === msg.uid)) {
              useStore.getState().setRoomPlayers([...p, { uid: msg.uid, username: msg.username, isHost: false, alive: true, x: 0, y: 0, z: 0, score: 0, level: 0 }])
            }
            break
          }

          case ServerMessageType.ROOM_PLAYER_LEFT: {
            const pl = useStore.getState().roomPlayers || []
            const remaining = pl.filter(x => x.uid !== msg.uid)
            useStore.getState().setRoomPlayers(remaining)
            remotePlayerStates.delete(msg.uid)

            const spectateTargetUid = useStore.getState().spectateTargetUid
            if (spectateTargetUid === msg.uid) {
              const alive = remaining.filter(p => p.alive)
              useStore.getState().setSpectateTargetUid(alive[0]?.uid || null)
            }
            break
          }

          case ServerMessageType.ROOM_PLAYERS_COMPACT: {
            const players = msg.players || []
            const roomPlayersList = useStore.getState().roomPlayers || []
            const now = performance.now()

            for (let i = 0; i < players.length; i++) {
              const p = players[i]
              const rosterPlayer = roomPlayersList[p.playerIndex]
              const pUid = rosterPlayer?.uid || p.uid || `player_${p.playerIndex}`

              let state = remotePlayerStates.get(pUid) || remotePlayerStates.get(p.playerIndex)
              if (!state) {
                state = {
                  uid: pUid,
                  playerIndex: p.playerIndex,
                  username: rosterPlayer?.username || 'PILOT',
                  alive: p.alive,
                  x: p.x,
                  y: p.y,
                  z: p.z,
                  speed: p.speed,
                  score: p.score,
                  level: p.level,
                  lastPacketTime: now,
                }
                remotePlayerStates.set(pUid, state)
                remotePlayerStates.set(p.playerIndex, state)
              } else {
                state.x = p.x
                state.y = p.y
                state.z = p.z
                state.speed = p.speed
                state.score = p.score
                state.level = p.level
                state.alive = p.alive
                state.lastPacketTime = now
                if (!remotePlayerStates.has(pUid)) remotePlayerStates.set(pUid, state)
                if (!remotePlayerStates.has(p.playerIndex)) remotePlayerStates.set(p.playerIndex, state)
              }
            }

            // Sync scores to roomPlayers state for UI ranking at throttled frequency (~5 Hz)
            if (!this._lastUiSync || now - this._lastUiSync > 200) {
              this._lastUiSync = now
              const updatedList = roomPlayersList.map((rp, idx) => {
                const compact = players.find(cp => cp.playerIndex === idx)
                if (compact) {
                  return {
                    ...rp,
                    score: compact.score,
                    alive: compact.alive,
                    x: compact.x,
                    y: compact.y,
                    z: compact.z,
                    speed: compact.speed,
                    level: compact.level,
                  }
                }
                return rp
              })
              useStore.getState().setRoomPlayers(updatedList)
            }
            break
          }

          case ServerMessageType.ROOM_PLAYERS: {
            const existing = useStore.getState().roomPlayers || []
            const existingMap = new Map(existing.map(p => [p.uid, p]))
            const now = performance.now()
            
            ;(msg.players || []).forEach(p => {
              const old = existingMap.get(p.uid)
              existingMap.set(p.uid, {
                ...old,
                ...p,
                username: p.username || old?.username || null,
                isHost: old?.isHost || false,
                alive: old?.alive === false ? false : p.alive,
              })

              let state = remotePlayerStates.get(p.uid)
              if (!state) {
                remotePlayerStates.set(p.uid, {
                  uid: p.uid,
                  username: p.username || 'PILOT',
                  alive: p.alive,
                  x: p.x,
                  y: p.y,
                  z: p.z,
                  speed: p.speed || 0,
                  score: p.score || 0,
                  level: p.level || 0,
                  lastPacketTime: now,
                  renderX: p.x,
                  renderY: p.y,
                  renderZ: p.z,
                  renderRoll: 0,
                })
              } else {
                state.x = p.x
                state.y = p.y
                state.z = p.z
                state.score = p.score
                state.alive = p.alive
                state.lastPacketTime = now
              }
            })

            useStore.getState().setRoomPlayers(Array.from(existingMap.values()))
            break
          }

          case ServerMessageType.ROOM_COUNTDOWN: {
            remotePlayerStates.clear()
            useStore.getState().setRoomStatus("countdown")
            useStore.getState().setGameOver(false)
            useStore.getState().setIsSpectating(false)
            useStore.getState().setScore(0)
            const pl = useStore.getState().roomPlayers || []
            useStore.getState().setRoomPlayers(pl.map(p => ({ ...p, alive: true, score: 0 })))
            break
          }

          case ServerMessageType.ROOM_STARTED: {
            remotePlayerStates.clear()
            useStore.getState().setRoomStatus("playing")
            useStore.getState().setGameOver(false)
            useStore.getState().setIsSpectating(false)
            const pl = useStore.getState().roomPlayers || []
            useStore.getState().setRoomPlayers(pl.map(p => ({ ...p, alive: true, score: 0 })))
            useStore.getState().restartGame()
            break
          }

          case ServerMessageType.ROOM_PLAYER_DIED: {
            const all = useStore.getState().roomPlayers || []
            useStore.getState().setRoomPlayers(all.map(p => p.uid === msg.uid ? { ...p, alive: false } : p))
            const state = remotePlayerStates.get(msg.uid)
            if (state) state.alive = false

            if (msg.uid === useStore.getState().uid) {
              useStore.getState().setGameStarted(false)
              useStore.getState().setGameOver(false)
              useStore.getState().setRoomStatus("lobby")
            }
            break
          }

          case ServerMessageType.ROOM_GAME_OVER:
            useStore.getState().setRoomRankings(msg.rankings || [])
            useStore.getState().setGameStarted(false)
            useStore.getState().setGameOver(false)
            useStore.getState().setRoomStatus("lobby")
            break

          case ServerMessageType.ROOM_RESET_LOBBY:
            remotePlayerStates.clear()
            useStore.getState().resetToLobby(msg.code, msg.seed, msg.players)
            break

          case ServerMessageType.ROOM_CLOSED:
            remotePlayerStates.clear()
            alert(msg.reason || "Room closed. Returning to main menu.")
            useStore.getState().returnToMainMenu()
            break

          case ServerMessageType.ROOM_ERROR:
            console.error('[Room]', msg.message)
            break

          default:
            break
        }
      }

      this.ws.onclose = () => {
        this.ws = null
        // Auto-reconnect after 3s
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = setTimeout(() => this.connect(), 3000)
      }

      this.ws.onerror = (err) => {
        console.error('[Leaderboard WS error]:', err)
      }
    } catch (e) {
      console.error('[Leaderboard Connect error]:', e)
    }
  }

  startSession(wallet, username) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect()
    }
    const id = wallet || getGuestId()
    let name = username
    if (!name && id.includes('@')) {
      name = id.split('@')[0]
    }
    const bytes = encodeClientMessage({
      type: ClientMessageType.START_SESSION,
      wallet: id,
      username: name || undefined
    })
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(bytes)
    }
  }

  sendTick(score, speed, level, x, y, z) {
    if (!this.sessionId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const bytes = encodeClientMessage({
      type: ClientMessageType.GAME_TICK,
      sessionId: this.sessionId,
      score: Math.max(0, score),
      speed: Math.max(0, speed),
      level: Math.max(0, level),
      timestamp: Date.now(),
      x: x || 0,
      y: y || 0,
      z: z || 0
    })
    this.ws.send(bytes)
  }

  submitScore(score, wallet, username) {
    const sendScore = () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return false
      }
      const id = wallet || getGuestId()
      let name = username
      if (!name && id.includes('@')) {
        name = id.split('@')[0]
      }
      const bytes = encodeClientMessage({
        type: ClientMessageType.SUBMIT_SCORE,
        sessionId: this.sessionId || '',
        wallet: id,
        score: Math.max(0, score),
        username: name || undefined
      })
      this.ws.send(bytes)
      this.sessionId = null
      useStore.getState().setSessionId(null)
      return true
    }

    if (!sendScore()) {
      this.connect()
      let retries = 0
      const retryInterval = setInterval(() => {
        retries++
        if (sendScore() || retries >= 5) {
          clearInterval(retryInterval)
          if (retries >= 5) {
            console.error('[Leaderboard] Failed to submit score after 5 retries')
          }
        }
      }, 1000)
    }

    // Defensive: force-refresh leaderboard after delay to ensure UI updates
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.getLeaderboard(20)
      }
    }, 1500)
    setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.getLeaderboard(20)
      }
    }, 4000)
  }

  getLeaderboard(limit = 20) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const bytes = encodeClientMessage({
      type: ClientMessageType.GET_LEADERBOARD,
      limit
    })
    this.ws.send(bytes)
  }

  updateUsername(username, wallet) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect()
    }
    const cleanName = username ? username.trim() : ''
    if (!cleanName) return
    this.pendingUsername = cleanName
    this.previousUsername = localStorage.getItem('rocket_rush_custom_username') || null
    const bytes = encodeClientMessage({
      type: ClientMessageType.UPDATE_USERNAME,
      wallet: wallet || useStore.getState().walletAddress || getGuestId(),
      username: cleanName
    })
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(bytes)
    }
  }

  checkUsername(username, wallet) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect()
      return
    }
    const cleanName = username ? username.trim() : ''
    if (!cleanName) {
      useStore.getState().setUsernameCheckResult(false, 'Username cannot be empty')
      return
    }
    const bytes = encodeClientMessage({
      type: ClientMessageType.CHECK_USERNAME,
      username: cleanName,
      wallet: wallet || useStore.getState().walletAddress || getGuestId()
    })
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(bytes)
    }
  }

  mergeGuestScores(fromWallet, toWallet) {
    if (!fromWallet || !toWallet || fromWallet === toWallet) return
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect()
    }
    const bytes = encodeClientMessage({
      type: ClientMessageType.MERGE_GUEST,
      fromWallet,
      toWallet
    })
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(bytes)
    }
  }

  createRoom() {
    const send = () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
      const state = useStore.getState()
      const wallet = state.walletAddress || getGuestId()
      const username = state.username || localStorage.getItem('rocket_rush_custom_username') || undefined
      this.ws.send(encodeClientMessage({ type: ClientMessageType.CREATE_ROOM, wallet, username }))
      return true
    }
    if (!send()) {
      this.connect()
      setTimeout(() => send(), 500)
    }
  }

  joinRoom(code) {
    const send = () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return false
      const state = useStore.getState()
      const wallet = state.walletAddress || getGuestId()
      const username = state.username || localStorage.getItem('rocket_rush_custom_username') || undefined
      this.ws.send(encodeClientMessage({ type: ClientMessageType.JOIN_ROOM, code, wallet, username }))
      return true
    }
    if (!send()) {
      this.connect()
      setTimeout(() => send(), 500)
    }
  }

  leaveRoom() {
    remotePlayerStates.clear()
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(encodeClientMessage({ type: ClientMessageType.LEAVE_ROOM }))
      } catch {}
    }
    useStore.getState().returnToMainMenu()
  }

  resetRoomToLobby() {
    remotePlayerStates.clear()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(encodeClientMessage({ type: ClientMessageType.RESET_ROOM_LOBBY }))
  }

  startRoom() {
    remotePlayerStates.clear()
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(encodeClientMessage({ type: ClientMessageType.START_ROOM }))
  }

  sendPlayerMove(x, y, z, speed, score, level) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const bytes = encodePlayerMove(x, y, z, speed, score, level)
    try {
      this.ws.send(bytes)
    } catch {}
  }
}

export const leaderboardService = new LeaderboardService()
