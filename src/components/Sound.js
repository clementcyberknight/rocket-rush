import { AudioListener, AudioLoader } from 'three'
import { useRef, useEffect, useState, Suspense } from 'react'
import { useLoader } from '@react-three/fiber'

import { useStore } from '../state/useStore'

import speedUp from '../audio/speedup.mp3'

function Sound() {
  const sound = useRef()
  const soundOrigin = useRef()
  const musicRef = useRef(null)

  const camera = useStore(s => s.camera)
  const level = useStore(s => s.level)
  const gameStarted = useStore(s => s.gameStarted)
  const gameOver = useStore(s => s.gameOver)
  const musicMuted = useStore(s => s.musicMuted)

  const [listener] = useState(() => new AudioListener())

  const speedUpSound = useLoader(AudioLoader, speedUp)

  // Major Soundtrack: vaitsez-game-gaming-trap-music-570137.mp3
  useEffect(() => {
    const audio = new Audio('/vaitsez-game-gaming-trap-music-570137.mp3')
    audio.loop = true
    audio.volume = 0.4
    musicRef.current = audio

    return () => {
      if (musicRef.current) {
        musicRef.current.pause()
        musicRef.current = null
      }
    }
  }, [])

  // Control major soundtrack playback
  useEffect(() => {
    const audio = musicRef.current
    if (!audio) return

    if (musicMuted) {
      audio.pause()
      return
    }

    if (gameStarted && !gameOver) {
      if (audio.paused) {
        audio.play().catch(err => console.log('[Sound] Autoplay deferred until user interaction:', err))
      }
    } else {
      audio.pause()
    }
  }, [gameStarted, gameOver, musicMuted])

  useEffect(() => {
    sound.current.setBuffer(speedUpSound)
    sound.current.setVolume(0.5)

    if (camera.current) {
      const cam = camera.current
      cam.add(listener)
      return () => cam.remove(listener)
    }
  }, [speedUpSound, camera, listener])

  useEffect(() => {
    if (gameStarted && level > 0 && !musicMuted) {
      sound.current.setBuffer(speedUpSound)
      if (!sound.current.isPlaying) {
        sound.current.play()
      }
    }
  }, [gameStarted, level, speedUpSound, musicMuted])

  return (
    <group ref={soundOrigin}>
      <audio ref={sound} args={[listener]} />
    </group>
  )
}

export default function SuspenseSound() {
  return (
    <Suspense fallback={null}>
      <Sound />
    </Suspense>
  )
}
