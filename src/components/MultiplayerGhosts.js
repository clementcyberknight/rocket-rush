import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Vector3 } from 'three'
import { useStore } from '../state/useStore'
import shipModel from '../models/spaceship.gltf'

const dracoPath = `${process.env.PUBLIC_URL}/draco/`

function OtherShip({ player, nodes, materials }) {
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
      <mesh geometry={nodes.Ship_Body.geometry}>
        <meshStandardMaterial color="#00f0ff" transparent opacity={0.85} emissive="#00f0ff" emissiveIntensity={0.6} />
      </mesh>
      {nodes.Ship_Body_1 && (
        <mesh geometry={nodes.Ship_Body_1.geometry} material={materials?.Chassis} />
      )}
      {nodes.Ship_Body_2 && (
        <mesh geometry={nodes.Ship_Body_2.geometry}>
          <meshBasicMaterial color="#ff0055" />
        </mesh>
      )}
      {nodes.Ship_Body_3 && (
        <mesh geometry={nodes.Ship_Body_3.geometry} material={materials?.['Gray Metal']} />
      )}
      {nodes.Ship_Body_4 && (
        <mesh geometry={nodes.Ship_Body_4.geometry}>
          <meshLambertMaterial color="#00f0ff" />
        </mesh>
      )}
    </group>
  )
}

export default function MultiplayerGhosts() {
  const roomPlayers = useStore(s => s.roomPlayers)
  const uid = useStore(s => s.uid)
  const { nodes, materials } = useGLTF(shipModel, dracoPath)

  const others = useMemo(() => {
    if (!roomPlayers || !uid) return []
    return roomPlayers.filter(p => p.uid !== uid && p.alive)
  }, [roomPlayers, uid])

  if (!nodes) return null

  return (
    <>
      {others.map(p => (
        <OtherShip key={p.uid} player={p} nodes={nodes} materials={materials} />
      ))}
    </>
  )
}
