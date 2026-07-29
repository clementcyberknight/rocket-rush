import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { Preload } from '@react-three/drei'

import { useStore } from '../state/useStore'

// THREE components
import Ship from './Ship'
import Ground from './Ground'
import Skybox from './Skybox'
import Cubes from './Cubes'
import Walls from './Walls'
import CubeTunnel from './CubeTunnel'
import Effects from './Effects'

// State/dummy components
import KeyboardControls from './KeyboardControls'
import GameState from './GameState'
import GhostShip from './GhostShip'
import MultiplayerGhosts from './MultiplayerGhosts'
import SpectateCamera from './SpectateCamera'
import GlobalColor from './GlobalColor'
import Sound from './Sound'

// HTML components
import Overlay from './html/Overlay'
import Hud from './html/Hud'
import RoomRanking from './RoomRanking'
import GameOverScreen from './html/GameOverScreen'
import MultiplayerGameOver from './html/MultiplayerGameOver'

export default function CubeWorld({ color, bgColor }) {
  const directionalLight = useStore((s) => s.directionalLight)
  const gameSession = useStore((s) => s.gameSession)

  return (
    <>
      <Canvas key={gameSession} gl={{ antialias: false, alpha: false, powerPreference: 'high-performance' }} dpr={[1, 1.5]} style={{ background: `${bgColor}` }}>
        <Suspense fallback={null}>
          <GameState />
          <Skybox />
          <directionalLight
            ref={directionalLight}
            intensity={3}
            position={[0, Math.PI, 0]}
          />
          <ambientLight intensity={0.1} />
          <Ship>
            {directionalLight.current && <primitive object={directionalLight.current.target} />}
          </Ship>
          <GhostShip />
          <MultiplayerGhosts />
          <SpectateCamera />
          <Walls />
          <Cubes />
          <CubeTunnel />
          <Ground groundColor={bgColor} />
          <KeyboardControls />
          <Effects />
          <GlobalColor />
          <Sound />
          <Preload all />
        </Suspense>
      </Canvas>
      <Hud />
      <RoomRanking />
      <GameOverScreen />
      <MultiplayerGameOver />
      <Overlay />
    </>
  )
}
