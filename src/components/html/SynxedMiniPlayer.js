import { useEffect } from 'react'
import 'synxed-sdk/synxed-web-player.css'

const apiKey = process.env.REACT_APP_SYNXED_API_KEY
const playlistCode = process.env.REACT_APP_SYNXED_PLAYLIST_CODE
const serverUrl = process.env.REACT_APP_SYNXED_SERVER_URL
const enableVoice = process.env.REACT_APP_SYNXED_ENABLE_VOICE === 'true'

export default function SynxedMiniPlayer() {
  useEffect(() => {
    let player
    let cancelled = false

    if (!apiKey || !playlistCode) {
      if (process.env.NODE_ENV !== 'production') {
        console.info(
          'Synxed mini player disabled. Set REACT_APP_SYNXED_API_KEY and REACT_APP_SYNXED_PLAYLIST_CODE to enable it.'
        )
      }
      return undefined
    }

    import('synxed-sdk')
      .then(({ SynxedWebPlayer }) => {
        if (cancelled) return

        const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640

        player = SynxedWebPlayer.mount({
          apiKey,
          serverUrl,
          source: {
            type: 'playlist',
            playlistCode
          },
          mode: 'mini',
          position: {
            placement: 'bottom-right',
            offsetX: isMobile ? 12 : 16,
            offsetY: isMobile ? 120 : 16
          },
          draggable: true,
          enableExpand: true,
          enableVoice,
          theme: {
            accent: '#fe2079',
            background: '#141622'
          }
        })
      })
      .catch((error) => {
        console.error('Failed to load Synxed mini player.', error)
      })

    return () => {
      cancelled = true
      player?.destroy()
    }
  }, [])

  return null
}
