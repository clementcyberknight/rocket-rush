import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Text } from '@react-three/drei'
import { useStore } from '../state/useStore'
import { remotePlayerStates } from '../services/leaderboardService'
import shipModel from '../models/spaceship.gltf'

const dracoPath = `${process.env.PUBLIC_URL}/draco/`

function OtherShip({ player, nodes, materials }) {
  const groupRef = useRef()
  const flameRef = useRef()
  const currentPos = useRef({
    x: player.x || 0,
    y: player.y || 3,
    z: player.z || -10,
    roll: 0,
  })

  useFrame((_, delta) => {
    if (!groupRef.current) return

    // Fetch latest high-frequency trajectory state from zero-overhead mutable map
    const state = remotePlayerStates.get(player.uid)
    const targetX = state ? state.x : (player.x || 0)
    const targetY = state ? state.y : (player.y || 3)
    const targetZ = state ? state.z : (player.z || -10)
    const speed = state ? (state.speed || 1.0) : 1.0
    const now = performance.now()
    const pktAgeSec = state ? Math.min(0.3, (now - state.lastPacketTime) / 1000) : 0

    // Dead Reckoning: extrapolate forward Z based on speed (1 speed unit = 165 Three.js units/sec)
    const extrapolatedZ = targetZ - (speed * 165) * pktAgeSec

    // Smooth interpolation with frame-rate independent exponential smoothing
    const cp = currentPos.current
    const lerpFactorPos = Math.min(1.0, delta * 20.0)
    const lerpFactorZ = Math.min(1.0, delta * 22.0)

    cp.x += (targetX - cp.x) * lerpFactorPos
    cp.y += (targetY - cp.y) * lerpFactorPos
    cp.z += (extrapolatedZ - cp.z) * lerpFactorZ

    // Dynamic lateral banking roll
    const lateralDelta = (targetX - cp.x)
    const targetRoll = Math.max(-0.55, Math.min(0.55, lateralDelta * 0.4))
    cp.roll += (targetRoll - cp.roll) * Math.min(1.0, delta * 12.0)

    groupRef.current.position.set(cp.x, cp.y, cp.z)
    groupRef.current.rotation.set(0, Math.PI, cp.roll)

    // Pulsate jet exhaust flame
    if (flameRef.current) {
      const pulse = 0.8 + Math.sin(now * 0.03) * 0.25
      const scaleZ = Math.max(0.6, speed * 0.8) * pulse
      flameRef.current.scale.set(1.0, 1.0, scaleZ)
    }
  })

  const username = player.username || 'PILOT'

  return (
    <group ref={groupRef} position={[player.x || 0, player.y || 3, player.z || -10]}>
      {/* Pilot Callsign Billboard */}
      <group position={[0, 2.6, 0]} rotation={[0, Math.PI, 0]}>
        <Text
          fontSize={0.85}
          color="#00f0ff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.06}
          outlineColor="#000000"
        >
          {username.toUpperCase()}
        </Text>
      </group>

      {/* Spaceship Meshes with Neon Cyan Glow */}
      <mesh geometry={nodes.Ship_Body.geometry}>
        <meshStandardMaterial
          color="#00f0ff"
          transparent
          opacity={0.92}
          emissive="#00f0ff"
          emissiveIntensity={0.8}
        />
      </mesh>
      {nodes.Ship_Body_1 && (
        <mesh geometry={nodes.Ship_Body_1.geometry} material={materials?.Chassis} />
      )}
      {nodes.Ship_Body_2 && (
        <mesh geometry={nodes.Ship_Body_2.geometry}>
          <meshBasicMaterial color="#fe2079" />
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

      {/* Jet Thruster Exhaust Glow */}
      <mesh ref={flameRef} position={[0, 0.45, -3.2]}>
        <coneGeometry args={[0.35, 1.8, 12]} />
        <meshBasicMaterial color="#00f0ff" transparent opacity={0.85} />
      </mesh>
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
