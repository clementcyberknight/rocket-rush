import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Vector3 } from 'three'
import { useStore } from '../state/useStore'
import shipModel from '../models/spaceship.gltf'

const dracoPath = `${process.env.PUBLIC_URL}/draco/`

function OtherShip({ player, geo1, geo2 }) {
  const groupRef = useRef()
  const targetPos = useRef(new Vector3(player.x || 0, player.y || 3, player.z || -10))

  useFrame(() => {
    if (!groupRef.current) return
    targetPos.current.set(player.x || 0, player.y || 3, player.z || -10)
    groupRef.current.position.lerp(targetPos.current, 0.25)
    groupRef.current.rotation.y = Math.PI
  })

  return (
    <group ref={groupRef} position={[player.x || 0, player.y || 3, player.z || -10]}>
      {geo1 && (
        <mesh geometry={geo1}>
          <meshStandardMaterial color="#00f0ff" transparent opacity={0.6} emissive="#00f0ff" emissiveIntensity={0.5} />
        </mesh>
      )}
      {geo2 && (
        <mesh geometry={geo2}>
          <meshStandardMaterial color="#ff0055" transparent opacity={0.6} emissive="#ff0055" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  )
}

export default function MultiplayerGhosts() {
  const roomPlayers = useStore(s => s.roomPlayers)
  const uid = useStore(s => s.uid)
  const { nodes } = useGLTF(shipModel, dracoPath)

  const geo1 = useMemo(() => nodes?.Ship_Body?.geometry, [nodes])
  const geo2 = useMemo(() => nodes?.Ship_Body_1?.geometry, [nodes])

  const others = useMemo(() => {
    if (!roomPlayers || !uid) return []
    return roomPlayers.filter(p => p.uid !== uid && p.alive)
  }, [roomPlayers, uid])

  return (
    <>
      {others.map(p => (
        <OtherShip key={p.uid} player={p} geo1={geo1} geo2={geo2} />
      ))}
    </>
  )
}
