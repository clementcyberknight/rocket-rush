import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/useStore'
import { remotePlayerStates } from '../services/leaderboardService'

export default function SpectateCamera() {
  const isSpectating = useStore(s => s.isSpectating)
  const roomPlayers = useStore(s => s.roomPlayers)
  const cameraRef = useStore(s => s.camera)
  const spectateTargetUid = useStore(s => s.spectateTargetUid)
  const spectateCamMode = useStore(s => s.spectateCamMode)
  const uid = useStore(s => s.uid)

  const smoothPos = useRef({ x: 0, y: 8, z: 3 })
  const smoothRoll = useRef(0)
  useEffect(() => {
    if (!isSpectating) return

    const handleKeyDown = (e) => {
      const alive = (useStore.getState().roomPlayers || []).filter(p => p.alive && p.uid !== uid)
      if (alive.length === 0) return

      const currentUid = useStore.getState().spectateTargetUid
      const currentIdx = alive.findIndex(p => p.uid === currentUid)

      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        const nextIdx = (currentIdx + 1) % alive.length
        useStore.getState().setSpectateTargetUid(alive[nextIdx].uid)
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        const prevIdx = (currentIdx - 1 + alive.length) % alive.length
        useStore.getState().setSpectateTargetUid(alive[prevIdx].uid)
      } else if (e.code === 'KeyC' || e.code === 'KeyV') {
        const currentMode = useStore.getState().spectateCamMode
        useStore.getState().setSpectateCamMode(currentMode === 'fpv' ? 'chase' : 'fpv')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isSpectating, uid])

  useFrame((_, delta) => {
    if (!isSpectating || !roomPlayers) return

    const alive = roomPlayers.filter(p => p.alive && p.uid !== uid)
    if (alive.length === 0) return

    let target = alive.find(p => p.uid === spectateTargetUid)
    if (!target) {
      target = alive[0]
      if (target && target.uid !== spectateTargetUid) {
        useStore.getState().setSpectateTargetUid(target.uid)
      }
    }
    if (!target) return

    const state = remotePlayerStates.get(target.uid)
    const tx = state ? state.x : (target.x || 0)
    const ty = state ? state.y : (target.y || 3)
    const tz = state ? state.z : (target.z || -10)
    const speed = state ? (state.speed || 1.0) : 1.0
    const now = performance.now()
    const pktAgeSec = state ? Math.min(0.25, (now - state.lastPacketTime) / 1000) : 0
    const extrapolatedZ = tz - (speed * 165) * pktAgeSec

    const cam = cameraRef?.current
    if (!cam) return

    // Compute goal camera coordinates matching active pilot view
    let goalX, goalY, goalZ
    if (spectateCamMode === 'fpv') {
      // 1st Person Cockpit View (exact pilot seat)
      goalX = tx
      goalY = ty + 1.2
      goalZ = extrapolatedZ + 0.6
    } else {
      // 3rd Person Chase View (PUBG / CODM vehicle chase camera)
      goalX = tx
      goalY = ty + 4.8
      goalZ = extrapolatedZ + 13.5
    }

    // High-performance exponential smoothing
    const sp = smoothPos.current
    const lerpRate = Math.min(1.0, delta * 22.0)
    sp.x += (goalX - sp.x) * lerpRate
    sp.y += (goalY - sp.y) * lerpRate
    sp.z += (goalZ - sp.z) * lerpRate

    // Dynamic banking tilt on camera
    const lateralDelta = (tx - sp.x)
    const targetRoll = Math.max(-0.2, Math.min(0.2, lateralDelta * 0.15))
    smoothRoll.current += (targetRoll - smoothRoll.current) * Math.min(1.0, delta * 10.0)

    cam.position.set(sp.x, sp.y, sp.z)
    cam.rotation.set(0, Math.PI, smoothRoll.current)
  })

  return null
}
