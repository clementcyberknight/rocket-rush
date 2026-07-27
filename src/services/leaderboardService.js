import {
  encodeClientMessage,
  decodeServerMessage,
  ClientMessageType,
  ServerMessageType
} from '../proto/protoCodec'
import { useStore } from '../state/useStore'

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
    const bytes = encodeClientMessage({
      type: ClientMessageType.START_SESSION,
      wallet: wallet || 'anonymous',
      username: username || undefined
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
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const bytes = encodeClientMessage({
      type: ClientMessageType.SUBMIT_SCORE,
      sessionId: this.sessionId || '',
      wallet: wallet || 'anonymous',
      score: Math.max(0, score),
      username: username || undefined
    })
    this.ws.send(bytes)
    this.sessionId = null
    useStore.getState().setSessionId(null)
  }

  getLeaderboard(limit = 20) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    const bytes = encodeClientMessage({
      type: ClientMessageType.GET_LEADERBOARD,
      limit
    })
    this.ws.send(bytes)
  }
}

export const leaderboardService = new LeaderboardService()
