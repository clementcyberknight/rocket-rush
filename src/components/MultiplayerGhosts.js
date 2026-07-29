import { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { useStore } from '../state/useStore'
import shipModel from '../models/spaceship.gltf'

const dracoPath = `${process.env.PUBLIC_URL}/draco/`

function OtherShip({ player, prevPos }) {
  const ref = useRef()

  useEffect(() => {
    if (prevPos.current) {
      prevPos.current.set(player.x, player.y, player.z)
    }
  }, [player.x, player.y, player.z])

  useFrame(() => {
    if (!ref.current) return
    if (!prevPos.current) {
      ref.current.position.set(player.x, player.y, player.z)
      return
    }
    ref.current.position.lerp(prevPos.current, 0.3)
    prevPos.current.set(player.x, player.y, player.z)
  })

  return (
    <group ref={ref}>
      <mesh geometry={player.geo1}>
        <meshStandardMaterial color="#666" transparent opacity={0.2} emissive="#333" emissiveIntensity={0.3} depthWrite={false} />
      </mesh>
      <mesh geometry={player.geo2}>
        <meshStandardMaterial color="#666" transparent opacity={0.2} emissive="#333" emissiveIntensity={0.3} depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function MultiplayerGhosts() {
  const roomPlayers = useStore(s => s.roomPlayers)
  const uid = useStore(s => s.uid)
  const { nodes } = useGLTF(shipModel, dracoPath)

  const prevPositions = useRef(new Map())
  const geo1 = useMemo(() => nodes?.Ship_Body?.geometry, [nodes])
  const geo2 = useMemo(() => nodes?.Ship_Body_1?.geometry, [nodes])

  const others = useMemo(() => {
    if (!roomPlayers || !uid) return []
    return roomPlayers.filter(p => p.uid !== uid && p.alive).map(p => ({
      ...p,
      geo1,
      geo2,
    }))
  }, [roomPlayers, uid, geo1, geo2])

  return (
    <>
      {others.map(p => {
        if (!prevPositions.current.has(p.uid)) {
          prevPositions.current.set(p.uid, { current: null, set: function(x, y, z) {
            if (!this.current) this.current = { x, y, z }
            else { this.current.x = x; this.current.y = y; this.current.z = z }
          }})
        }
        return (
          <OtherShip
            key={p.uid}
            player={p}
            prevPos={prevPositions.current.get(p.uid)}
          />
        )
      })}
    </>
  )
}
