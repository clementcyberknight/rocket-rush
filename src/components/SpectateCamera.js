import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/useStore'

export default function SpectateCamera() {
  const isSpectating = useStore(s => s.isSpectating)
  const roomPlayers = useStore(s => s.roomPlayers)
  const cameraRef = useStore(s => s.camera)
  const spectateTargetUid = useStore(s => s.spectateTargetUid)
  const spectateCamMode = useStore(s => s.spectateCamMode)

  const smoothPos = useRef({ x: 0, y: 8, z: 3 })

  useFrame(() => {
    if (!isSpectating || !roomPlayers) return

    const alive = roomPlayers.filter(p => p.alive)
    if (alive.length === 0) return

    let target = alive.find(p => p.uid === spectateTargetUid)
    if (!target) target = alive[0]

    const tx = target.x || 0
    const ty = target.y || 3
    const tz = target.z || -10

    const cam = cameraRef?.current
    if (!cam) return

    // Use same camera setup as Ship.js: position behind+above ship, rotation.y = Math.PI
    let goalX, goalY, goalZ
    if (spectateCamMode === 'fpv') {
      // First-person: cockpit view, same position as ship
      goalX = tx
      goalY = ty + 1.2
      goalZ = tz + 1
    } else {
      // Chase: behind and above, same as Ship.js uses
      goalX = tx
      goalY = ty + 5
      goalZ = tz + 13.5
    }

    // Smooth lerp
    const sp = smoothPos.current
    sp.x += (goalX - sp.x) * 0.2
    sp.y += (goalY - sp.y) * 0.2
    sp.z += (goalZ - sp.z) * 0.2

    cam.position.set(sp.x, sp.y, sp.z)
    cam.rotation.set(0, Math.PI, 0)
  })

  return null
}
