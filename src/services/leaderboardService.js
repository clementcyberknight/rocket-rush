import {
  encodeClientMessage,
  decodeServerMessage,
  ClientMessageType,
  ServerMessageType
} from '../proto/protoCodec'
import { useStore } from '../state/useStore'

function getGuestId() {
  let guestId = localStorage.getItem('rocket_rush_guest_id')
  if (!guestId) {
    guestId = `user_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
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
            useStore.getState().setSessionId(msg.sessionId)
            break

          case ServerMessageType.LEADERBOARD:
            useStore.getState().setLeaderboard(msg.entries, msg.week)
            break

          case ServerMessageType.SCORE_SUBMITTED:
            useStore.getState().setUserRank(msg.rank, msg.score, msg.valid)
            break

          case ServerMessageType.ERROR:
            console.warn('[Leaderboard] Backend error:', msg.message)
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

  sendTick(score, speed, level) {
    if (!this.sessionId || !this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const bytes = encodeClientMessage({
      type: ClientMessageType.GAME_TICK,
      sessionId: this.sessionId,
      score: Math.max(0, score),
      speed: Math.max(0, speed),
      level: Math.max(0, level),
      timestamp: Date.now()
    })
    this.ws.send(bytes)
  }

  submitScore(score, wallet, username) {
    const sendScore = () => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        console.warn('[Leaderboard] WS not open for score submission, retrying...')
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
      // WS not open — reconnect and retry after connection opens
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
    const bytes = encodeClientMessage({
      type: ClientMessageType.UPDATE_USERNAME,
      wallet: wallet || useStore.getState().walletAddress || getGuestId(),
      username: cleanName
    })
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(bytes)
    }
    useStore.getState().setUsername(cleanName)
    localStorage.setItem('rocket_rush_custom_username', cleanName)
  }
}

export const leaderboardService = new LeaderboardService()
