import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStore } from '../state/useStore'
import { Vector3 } from 'three'

const v = new Vector3()

export default function SpectateCamera() {
  const isSpectating = useStore(s => s.isSpectating)
  const roomPlayers = useStore(s => s.roomPlayers)
  const { camera } = useThree()
  const targetRef = useRef({ x: 0, y: 3, z: -10 })
  const prevTarget = useRef({ x: 0, y: 3, z: -10 })

  useFrame(() => {
    if (!isSpectating || !roomPlayers) {
      camera.position.set(0, 5, -10)
      camera.lookAt(0, 3, 10)
      return
    }

    const alive = roomPlayers.filter(p => p.alive)
    if (alive.length === 0) return

    const target = alive[0]
    targetRef.current.x = target.x || 0
    targetRef.current.y = (target.y || 3) + 1
    targetRef.current.z = (target.z || -10)

    const pt = prevTarget.current
    pt.x += (targetRef.current.x - pt.x) * 0.1
    pt.y += (targetRef.current.y - pt.y) * 0.1
    pt.z += (targetRef.current.z - pt.z) * 0.1

    camera.position.set(
      pt.x + 2,
      pt.y + 5,
      pt.z + 14
    )
    camera.lookAt(
      v.set(pt.x, pt.y, pt.z + 10)
    )
  })

  return null
}
