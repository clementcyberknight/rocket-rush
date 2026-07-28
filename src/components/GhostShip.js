import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/useStore'

export default function GhostShip() {
  const ghostPath = useStore(s => s.ghostPath)
  const ghostInterval = useStore(s => s.ghostInterval)
  const gameSession = useStore(s => s.gameSession)
  const ghostRef = useRef()
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    startTimeRef.current = Date.now()
  }, [gameSession])

  useFrame(() => {
    if (!ghostRef.current) return
    if (!ghostPath || ghostPath.length < 2) {
      ghostRef.current.visible = false
      return
    }

    const elapsed = Date.now() - startTimeRef.current
    const idx = elapsed / ghostInterval

    if (idx >= ghostPath.length - 1) {
      ghostRef.current.visible = false
      return
    }

    const i = Math.floor(idx)
    const frac = idx - i
    const a = ghostPath[i]
    const b = ghostPath[i + 1]

    ghostRef.current.visible = true
    ghostRef.current.position.set(
      a.x + (b.x - a.x) * frac,
      a.y + (b.y - a.y) * frac,
      a.z + (b.z - a.z) * frac
    )
  })

  return (
    <group ref={ghostRef} visible={false}>
      <mesh>
        <boxGeometry args={[1.2, 1.2, 1.2]} />
        <meshStandardMaterial
          color="#555555"
          transparent
          opacity={0.25}
          emissive="#333333"
          emissiveIntensity={0.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
