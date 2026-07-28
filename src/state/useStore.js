import { Color } from 'three'
import { createRef } from 'react'
import create from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'


//test
const useStore = create(subscribeWithSelector((set, get) => {

  return {
    set,
    get,
    score: 0,
    level: 0,
    gameOver: false,
    gameStarted: false,
    gameSession: 0,
    isSpeedingUp: false,
    controls: {
      left: false,
      right: false,
    },
    steeringSensitivity: parseFloat(localStorage.getItem('rocket_rush_sensitivity') || '1.0'),
    setSteeringSensitivity: (val) => {
      const clamped = Math.max(0.5, Math.min(3.0, val))
      localStorage.setItem('rocket_rush_sensitivity', clamped.toString())
      set({ steeringSensitivity: clamped })
    },
    musicMuted: localStorage.getItem('rocket_rush_music_muted') === 'true',
    toggleMusic: () => set(state => {
      const next = !state.musicMuted
      localStorage.setItem('rocket_rush_music_muted', next.toString())
      return { musicMuted: next }
    }),
    directionalLight: createRef(),
    camera: createRef(),
    ship: createRef(),
    sun: createRef(),
    setIsSpeedingUp: (speedingUp) => set(state => ({ isSpeedingUp: speedingUp })),
    incrementLevel: () => set(state => ({ level: state.level + 1 })),
    setScore: (score) => set(state => ({ score: score })),
    setGameStarted: (started) => set(state => ({ gameStarted: started })),
    setGameOver: (over) => set(state => ({ gameOver: over })),

    // Leaderboard & Wallet state
    walletAddress: null,
    username: localStorage.getItem('rocket_rush_custom_username') || null,
    sessionId: null,
    leaderboard: [],
    currentWeek: '',
    leaderboardVersion: 0,
    userRank: 0,
    userHighScore: 0,
    submissionValid: true,

    setWalletAddress: (addr) => set({ walletAddress: addr }),
    setUsername: (name) => set({ username: name }),
    setSessionId: (id) => set({ sessionId: id }),
    setLeaderboard: (leaderboard, week) => set(state => ({ leaderboard, currentWeek: week, leaderboardVersion: state.leaderboardVersion + 1 })),
    setUserRank: (rank, score, valid = true) => set(state => ({ userRank: rank, userHighScore: Math.max(state.userHighScore, score), submissionValid: valid })),
    setUserRankFromLeaderboard: (rank, score) => set(state => ({ userRank: rank, userHighScore: Math.max(state.userHighScore, score) })),
    usernameUpdateResult: null,
    setUsernameUpdateResult: (success, message) => set({ usernameUpdateResult: { success, message, timestamp: Date.now() } }),
    usernameCheckResult: null,
    setUsernameCheckResult: (available, error) => set({ usernameCheckResult: { available, error, timestamp: Date.now() } }),

    restartGame: () => {
      mutation.gameOver = false
      mutation.score = 0
      mutation.gameSpeed = 0
      mutation.desiredSpeed = 0
      mutation.horizontalVelocity = 0
      mutation.colorLevel = 0
      mutation.shouldShiftItems = false
      mutation.currentLevelLength = 0
      mutation.globalColor.set(0xff2190)

      set(state => ({
        score: 0,
        level: 0,
        gameOver: false,
        gameStarted: true,
        gameSession: state.gameSession + 1,
        isSpeedingUp: false,
        controls: { left: false, right: false },
        userRank: 0,
        submissionValid: true,
      }))
    }
  }
}))

const mutation = {
  gameOver: false,
  score: 0,
  gameSpeed: 0.0,
  desiredSpeed: 0.0,
  horizontalVelocity: 0,
  colorLevel: 0,
  shouldShiftItems: false,
  currentLevelLength: 0,
  globalColor: new Color()
}

export { useStore, mutation }
