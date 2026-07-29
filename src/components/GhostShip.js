import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useStore } from '../state/useStore'
import shipModel from '../models/spaceship.gltf'

const dracoPath = `${process.env.PUBLIC_URL}/draco/`

export default function GhostShip() {
  const roomCode = useStore(s => s.roomCode)
  const ghostPath = useStore(s => s.ghostPath)
  const ghostInterval = useStore(s => s.ghostInterval)
  const gameSession = useStore(s => s.gameSession)
  const ghostRef = useRef()
  const startTimeRef = useRef(Date.now())

  const { nodes } = useGLTF(shipModel, dracoPath)

  if (roomCode) return null

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

  if (!nodes) return null

  return (
    <group ref={ghostRef} visible={false} dispose={null}>
      <mesh geometry={nodes.Ship_Body.geometry}>
        <meshStandardMaterial color="#666666" transparent opacity={0.25} emissive="#333333" emissiveIntensity={0.4} depthWrite={false} />
      </mesh>
      <mesh geometry={nodes.Ship_Body_1.geometry}>
        <meshStandardMaterial color="#666666" transparent opacity={0.25} emissive="#333333" emissiveIntensity={0.4} depthWrite={false} />
      </mesh>
      <mesh geometry={nodes.Ship_Body_2.geometry}>
        <meshStandardMaterial color="#666666" transparent opacity={0.25} emissive="#333333" emissiveIntensity={0.4} depthWrite={false} />
      </mesh>
      <mesh geometry={nodes.Ship_Body_3.geometry}>
        <meshStandardMaterial color="#666666" transparent opacity={0.25} emissive="#333333" emissiveIntensity={0.4} depthWrite={false} />
      </mesh>
      <mesh geometry={nodes.Ship_Body_4.geometry}>
        <meshStandardMaterial color="#666666" transparent opacity={0.25} emissive="#333333" emissiveIntensity={0.4} depthWrite={false} />
      </mesh>
    </group>
  )
}
