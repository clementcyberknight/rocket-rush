import {
  encodeClientMessage,
  decodeServerMessage,
  ClientMessageType,
  ServerMessageType
} from '../proto/protoCodec'
import { useStore } from '../state/useStore'

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
        // Fetch current weekly leaderboard upon connecting
        this.getLeaderboard(20)

        // If we're in an active game session, re-establish it with the backend
        const state = useStore.getState()
        if (state.gameStarted && !state.gameOver) {
          this.startSession(state.walletAddress, state.username)
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

          case ServerMessageType.ROOM_CREATED:
            useStore.getState().setRoomCode(msg.code)
            useStore.getState().setRoomSeed(msg.seed)
            useStore.getState().setIsRoomHost(true)
            useStore.getState().setRoomStatus("lobby")
            useStore.getState().setRoomPlayers([])
            break

          case ServerMessageType.ROOM_JOINED:
            useStore.getState().setRoomCode(msg.code)
            useStore.getState().setRoomSeed(msg.seed)
            useStore.getState().setRoomStatus("lobby")
            useStore.getState().setRoomPlayers(msg.players || [])
            useStore.getState().setIsRoomHost(false)
            break

          case ServerMessageType.ROOM_PLAYER_JOINED: {
            const p = useStore.getState().roomPlayers || []
            if (!p.find(x => x.uid === msg.uid)) {
              useStore.getState().setRoomPlayers([...p, { uid: msg.uid, username: msg.username, isHost: false, alive: true, x: 0, y: 0, z: 0, score: 0, level: 0 }])
            }
            break
          }

          case ServerMessageType.ROOM_PLAYER_LEFT: {
            const pl = useStore.getState().roomPlayers || []
            useStore.getState().setRoomPlayers(pl.filter(x => x.uid !== msg.uid))
            break
          }

          case ServerMessageType.ROOM_PLAYERS:
            useStore.getState().setRoomPlayers(msg.players || [])
            break

          case ServerMessageType.ROOM_COUNTDOWN:
            useStore.getState().setRoomStatus("countdown")
            break

          case ServerMessageType.ROOM_STARTED:
            useStore.getState().setRoomStatus("playing")
            break

          case ServerMessageType.ROOM_PLAYER_DIED: {
            const all = useStore.getState().roomPlayers || []
            useStore.getState().setRoomPlayers(all.map(p => p.uid === msg.uid ? { ...p, alive: false } : p))
            break
          }

          case ServerMessageType.ROOM_GAME_OVER:
            useStore.getState().setRoomRankings(msg.rankings || [])
            useStore.getState().setRoomStatus("finished")
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.connect(); return }
    this.ws.send(encodeClientMessage({ type: ClientMessageType.CREATE_ROOM }))
  }

  joinRoom(code) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { this.connect(); return }
    this.ws.send(encodeClientMessage({ type: ClientMessageType.JOIN_ROOM, code }))
  }

  leaveRoom() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(encodeClientMessage({ type: ClientMessageType.LEAVE_ROOM }))
  }

  startRoom() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(encodeClientMessage({ type: ClientMessageType.START_ROOM }))
  }
}

export const leaderboardService = new LeaderboardService()
