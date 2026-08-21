import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Text } from '@react-three/drei'
import { useStore } from '../state/useStore'
import { remotePlayerStates } from '../services/leaderboardService'
import shipModel from '../models/spaceship.gltf'

const dracoDecoderPath = `${process.env.PUBLIC_URL}/draco/`

const NEON_COLORS = [
  '#00f0ff', // Electric Cyan
  '#00ff88', // Emerald Neon
  '#ff007f', // Hot Magenta
  '#ffe600', // Cyber Yellow
  '#a855f7', // Hyper Purple
  '#ff5500', // Plasma Orange
]

function OtherShip({ player, index, nodes, materials }) {
  const groupRef = useRef()
  const flameRef = useRef()
  const flameInnerRef = useRef()
  const pointLightRef = useRef()
  const leftWingTrail = useRef()
  const rightWingTrail = useRef()

  const neonColor = NEON_COLORS[index % NEON_COLORS.length]

  const currentPos = useRef({
    x: player.x || 0,
    y: player.y || 3,
    z: player.z || -10,
    roll: 0,
  })

  useFrame((state, delta) => {
    if (!groupRef.current) return

    // Lookup remote state by UID, playerIndex, or username
    const pState = remotePlayerStates.get(player.uid) ||
                   remotePlayerStates.get(player.playerIndex) ||
                   remotePlayerStates.get(player.username)

    const targetX = (pState && !isNaN(pState.x)) ? pState.x : (player.x || 0)
    const targetY = (pState && !isNaN(pState.y)) ? pState.y : (player.y || 3)
    const targetZ = (pState && !isNaN(pState.z)) ? pState.z : (player.z || -10)
    const speed = (pState && !isNaN(pState.speed)) ? pState.speed : 1.0
    const now = performance.now()
    const pktAgeSec = pState ? Math.min(0.6, (now - (pState.lastPacketTime || now)) / 1000) : 0

    // Velocity Dead Reckoning
    const extrapolatedZ = targetZ - (speed * 165) * pktAgeSec

    const cp = currentPos.current
    if (isNaN(cp.x)) cp.x = targetX
    if (isNaN(cp.y)) cp.y = targetY
    if (isNaN(cp.z)) cp.z = extrapolatedZ

    // High-responsiveness exponential smoothing
    const lerpPos = Math.min(1.0, delta * 20.0)
    const lerpZ = Math.min(1.0, delta * 26.0)

    cp.x += (targetX - cp.x) * lerpPos
    cp.y += (targetY - cp.y) * lerpPos
    cp.z += (extrapolatedZ - cp.z) * lerpZ

    // Dynamic lateral banking roll
    const lateralDelta = targetX - cp.x
    const targetRoll = Math.max(-0.6, Math.min(0.6, lateralDelta * 0.45))
    cp.roll += (targetRoll - cp.roll) * Math.min(1.0, delta * 14.0)

    groupRef.current.position.set(cp.x, cp.y, cp.z)
    groupRef.current.rotation.set(0, Math.PI, cp.roll)

    // Pulsate jet exhaust flames
    const time = state.clock.getElapsedTime()
    const pulse = 0.85 + Math.sin(time * 25) * 0.2
    const scaleZ = Math.max(0.7, speed * 0.9) * pulse

    if (flameRef.current) {
      flameRef.current.scale.set(1.0, 1.0, scaleZ)
    }
    if (flameInnerRef.current) {
      flameInnerRef.current.scale.set(0.6, 0.6, scaleZ * 1.3)
    }

    // Wing trails micro-vibration
    const fastSine = Math.sin(time * 15)
    if (leftWingTrail.current && rightWingTrail.current) {
      leftWingTrail.current.scale.x = 0.1 + fastSine / 60
      rightWingTrail.current.scale.x = 0.1 + fastSine / 60
    }

    // Point light follow along
    if (pointLightRef.current) {
      pointLightRef.current.position.set(cp.x, cp.y + 0.5, cp.z)
    }
  })

  const username = player.username || 'PILOT'

  return (
    <group>
      {/* Ship Point Light Illuminating Ground Under Friend */}
      <pointLight
        ref={pointLightRef}
        color={neonColor}
        decay={8}
        distance={25}
        intensity={3.5}
        position={[player.x || 0, (player.y || 3) + 0.5, player.z || -10]}
      />

      <group ref={groupRef} position={[player.x || 0, player.y || 3, player.z || -10]}>
        {/* Floating Holographic Callsign Billboard */}
        <group position={[0, 2.5, 0]} rotation={[0, Math.PI, 0]}>
          <Text
            fontSize={0.9}
            color={neonColor}
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.08}
            outlineColor="#000000"
          >
            {username.toUpperCase()}
          </Text>
        </group>

        {/* High-Fidelity Cyber Spaceship Hull */}
        <mesh geometry={nodes.Ship_Body.geometry}>
          <meshStandardMaterial
            attach="material"
            color={neonColor}
            metalness={0.85}
            roughness={0.15}
            emissive={neonColor}
            emissiveIntensity={0.65}
          />
        </mesh>
        {nodes.Ship_Body_1 && (
          <mesh geometry={nodes.Ship_Body_1.geometry} material={materials?.Chassis} />
        )}
        {nodes.Ship_Body_2 && (
          <mesh geometry={nodes.Ship_Body_2.geometry}>
            <meshBasicMaterial attach="material" color="#ffaa00" />
          </mesh>
        )}
        {nodes.Ship_Body_3 && (
          <mesh geometry={nodes.Ship_Body_3.geometry} material={materials?.['Gray Metal']} />
        )}
        {nodes.Ship_Body_4 && (
          <mesh geometry={nodes.Ship_Body_4.geometry}>
            <meshLambertMaterial attach="material" color="white" />
          </mesh>
        )}

        {/* Dual Wingtip Laser Trails */}
        <mesh ref={leftWingTrail} scale={[0.1, 0.05, 2.5]} position={[1.4, 0.2, 1.0]}>
          <dodecahedronGeometry args={[1.5, 3]} />
          <meshBasicMaterial transparent opacity={0.8} color={neonColor} />
        </mesh>
        <mesh ref={rightWingTrail} scale={[0.1, 0.05, 2.5]} position={[-1.4, 0.2, 1.0]}>
          <dodecahedronGeometry args={[1.5, 3]} />
          <meshBasicMaterial transparent opacity={0.8} color={neonColor} />
        </mesh>

        {/* Multi-layered Pulsating Jet Engine Flames */}
        <mesh ref={flameRef} position={[0, -0.3, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.45, 2.4, 16]} />
          <meshBasicMaterial color={neonColor} transparent opacity={0.85} />
        </mesh>
        <mesh ref={flameInnerRef} position={[0, -0.3, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.25, 1.8, 16]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
        </mesh>
      </group>
    </group>
  )
}

export default function MultiplayerGhosts() {
  const roomPlayers = useStore(s => s.roomPlayers)
  const uid = useStore(s => s.uid)
  const isRoomHost = useStore(s => s.isRoomHost)
  const { nodes, materials } = useGLTF(shipModel, dracoDecoderPath)

  const others = useMemo(() => {
    if (!roomPlayers || roomPlayers.length <= 1) return []
    const myUid = uid || (isRoomHost ? roomPlayers[0]?.uid : null)
    return roomPlayers.filter((p, i) => {
      if (myUid && p.uid === myUid) return false
      if (!myUid && isRoomHost && i === 0) return false
      return p.alive !== false
    })
  }, [roomPlayers, uid, isRoomHost])

  if (!nodes || others.length === 0) return null

  return (
    <>
      {others.map((p, idx) => (
        <OtherShip
          key={p.uid || `ghost_${idx}`}
          player={p}
          index={idx}
          nodes={nodes}
          materials={materials}
        />
      ))}
    </>
  )
}

useGLTF.preload(shipModel, dracoDecoderPath)
