import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'

import { useStore, mutation } from '../state/useStore'
import { INITIAL_GAME_SPEED, PLANE_SIZE, LEVEL_SIZE } from '../constants'
import { leaderboardService } from '../services/leaderboardService'

const shipSelector = s => s.ship
const setScoreSelector = s => s.setScore
const gameStartedSelector = s => s.gameStarted
const setIsSpeedingUpSelector = s => s.setIsSpeedingUp
const setGameOverSelector = s => s.setGameOver

export default function GameState() {
  const ship = useStore(shipSelector)
  const setScore = useStore(setScoreSelector)
  const gameStarted = useStore(gameStartedSelector)
  const setIsSpeedingUp = useStore(setIsSpeedingUpSelector)
  const setGameOver = useStore(setGameOverSelector)
  const gameOver = useStore(s => s.gameOver)

  const level = useStore(s => s.level)
  const walletAddress = useStore(s => s.walletAddress)

  const lastTickTimeRef = useRef(0)
  const sessionStartedRef = useRef(false)

  // Connect to backend on initial load
  useEffect(() => {
    leaderboardService.connect()
  }, [])

  useEffect(() => {
    mutation.currentLevelLength = -(level * PLANE_SIZE * LEVEL_SIZE)
  }, [level])

  // Handle Game Session Start
  useEffect(() => {
    if (gameStarted && !gameOver && !sessionStartedRef.current) {
      mutation.desiredSpeed = INITIAL_GAME_SPEED
      sessionStartedRef.current = true
      leaderboardService.startSession(walletAddress)
    }
  }, [gameStarted, gameOver, walletAddress])

  // Handle Game Over Score Submission
  useEffect(() => {
    if (gameOver && sessionStartedRef.current) {
      sessionStartedRef.current = false
      const finalScore = Math.max(0, mutation.score)
      leaderboardService.submitScore(finalScore, walletAddress)
    }
  }, [gameOver, walletAddress])

  useFrame((state, delta) => {
    // acceleration logic
    const accelDelta = 1 * delta * 0.15
    if (gameStarted && !mutation.gameOver) {
      if (mutation.gameSpeed < mutation.desiredSpeed) {
        setIsSpeedingUp(true)
        if (mutation.gameSpeed + accelDelta > mutation.desiredSpeed) {
          mutation.gameSpeed = mutation.desiredSpeed
        } else {
          mutation.gameSpeed += accelDelta
        }
      } else {
        setIsSpeedingUp(false)
      }
    }

    if (ship.current) {
      // sets the score counter in the hud
      mutation.score = Math.max(0, Math.abs(ship.current.position.z) - 10)

      // Realtime Telemetry Anti-Cheat Tick (Sent every ~1.0 second)
      if (gameStarted && !mutation.gameOver) {
        const now = state.clock.getElapsedTime()
        if (now - lastTickTimeRef.current >= 1.0) {
          lastTickTimeRef.current = now
          leaderboardService.sendTick(mutation.score, mutation.gameSpeed, level)
        }
      }

      // optimization, instead of calculating this for all elements we do it once per frame here
      mutation.shouldShiftItems = ship.current.position.z < -400 && ship.current.position.z < mutation.currentLevelLength - 400 && ship.current.position.z > mutation.currentLevelLength - 1000
    }

    if (gameStarted && mutation.gameOver) {
      setScore(Math.max(0, Math.abs(ship.current.position.z) - 10))
      setGameOver(true)
    }
  })

  return null
}
