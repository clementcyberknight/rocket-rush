import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/useStore'
import { remotePlayerStates } from '../services/leaderboardService'

export default function SpectateCamera() {
  const isSpectating = useStore(s => s.isSpectating)
  const roomPlayers = useStore(s => s.roomPlayers)
  const cameraRef = useStore(s => s.camera)
  const spectateTargetUid = useStore(s => s.spectateTargetUid)
  const spectateCamMode = useStore(s => s.spectateCamMode)

  const smoothPos = useRef({ x: 0, y: 8, z: 3 })
  const smoothRot = useRef({ x: 0, y: Math.PI, z: 0 })

  useFrame((_, delta) => {
    if (!isSpectating || !roomPlayers) return

    const alive = roomPlayers.filter(p => p.alive)
    if (alive.length === 0) return

    let target = alive.find(p => p.uid === spectateTargetUid)
    if (!target) {
      target = alive[0]
      if (target && target.uid !== spectateTargetUid) {
        useStore.getState().setSpectateTargetUid(target.uid)
      }
    }

    // High-frequency position with dead reckoning extrapolation
    const state = remotePlayerStates.get(target.uid)
    const tx = state ? state.x : (target.x || 0)
    const ty = state ? state.y : (target.y || 3)
    const tz = state ? state.z : (target.z || -10)
    const speed = state ? (state.speed || 1.0) : 1.0
    const now = performance.now()
    const pktAgeSec = state ? Math.min(0.3, (now - state.lastPacketTime) / 1000) : 0
    const extrapolatedZ = tz - (speed * 165) * pktAgeSec

    const cam = cameraRef?.current
    if (!cam) return

    let goalX, goalY, goalZ
    if (spectateCamMode === 'fpv') {
      // First-person cockpit view
      goalX = tx
      goalY = ty + 1.2
      goalZ = extrapolatedZ + 0.5
    } else {
      // Third-person chase view: elevated behind the ship
      goalX = tx
      goalY = ty + 4.8
      goalZ = extrapolatedZ + 13.0
    }

    // Smooth lerp
    const sp = smoothPos.current
    const lerpRate = Math.min(1.0, delta * 18.0)
    sp.x += (goalX - sp.x) * lerpRate
    sp.y += (goalY - sp.y) * lerpRate
    sp.z += (goalZ - sp.z) * lerpRate

    cam.position.set(sp.x, sp.y, sp.z)
    cam.rotation.set(0, Math.PI, 0)
  })

  return null
}
