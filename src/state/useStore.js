import { Color } from 'three'
import { createRef } from 'react'
import create from 'zustand'

const useStore = create((set, get) => {

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
    directionalLight: createRef(),
    camera: createRef(),
    ship: createRef(),
    sun: createRef(),
    setIsSpeedingUp: (speedingUp) => set(state => ({ isSpeedingUp: speedingUp })),
    incrementLevel: () => set(state => ({ level: state.level + 1 })),
    setScore: (score) => set(state => ({ score: score })),
    setGameStarted: (started) => set(state => ({ gameStarted: started })),
    setGameOver: (over) => set(state => ({ gameOver: over })),

    // Leaderboard state
    sessionId: null,
    leaderboard: [],
    currentWeek: '',
    userRank: 0,
    userHighScore: 0,
    submissionValid: true,

    setSessionId: (id) => set({ sessionId: id }),
    setLeaderboard: (leaderboard, week) => set({ leaderboard, currentWeek: week }),
    setUserRank: (rank, score, valid = true) => set({ userRank: rank, userHighScore: score, submissionValid: valid }),

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
        controls: { left: false, right: false }
      }))
    }
  }
})

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
