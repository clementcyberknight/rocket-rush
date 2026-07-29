import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '../state/useStore'
import { Vector3 } from 'three'

const v = new Vector3()

export default function SpectateCamera() {
  const isSpectating = useStore(s => s.isSpectating)
  const roomPlayers = useStore(s => s.roomPlayers)
  const cameraRef = useStore(s => s.camera)
  const spectateTargetUid = useStore(s => s.spectateTargetUid)
  const spectateCamMode = useStore(s => s.spectateCamMode)

  const targetRef = useRef({ x: 0, y: 3, z: -10 })
  const prevTarget = useRef({ x: 0, y: 3, z: -10 })

  useFrame(() => {
    if (!isSpectating || !roomPlayers) return

    const alive = roomPlayers.filter(p => p.alive)
    if (alive.length === 0) return

    let target = alive.find(p => p.uid === spectateTargetUid)
    if (!target) target = alive[0]

    targetRef.current.x = target.x || 0
    targetRef.current.y = target.y || 3
    targetRef.current.z = target.z || -10

    const pt = prevTarget.current
    pt.x += (targetRef.current.x - pt.x) * 0.25
    pt.y += (targetRef.current.y - pt.y) * 0.25
    pt.z += (targetRef.current.z - pt.z) * 0.25

    const cam = cameraRef?.current
    if (cam) {
      if (spectateCamMode === 'fpv') {
        // First-Person Cockpit View
        cam.position.set(pt.x, pt.y + 0.9, pt.z - 0.5)
        cam.lookAt(v.set(pt.x, pt.y + 0.9, pt.z - 100))
        cam.rotation.z = Math.PI
      } else {
        // Chase View
        cam.position.set(pt.x, pt.y + 4, pt.z + 12)
        cam.lookAt(v.set(pt.x, pt.y + 2, pt.z - 50))
        cam.rotation.z = Math.PI
      }
    }
  })

  return null
}
