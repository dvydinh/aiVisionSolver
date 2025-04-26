import { useState, useEffect, useRef } from 'react'
import { useStealthCapture } from '../hooks/useStealthCapture'
import { solveQuestion } from '../services/aiService'
import { updateStatus, pushAnswer } from '../services/databaseService'

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      await navigator.wakeLock.request('screen')
    }
  } catch {}
}

export default function ScannerView({ sessionId, onBack }) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('ready')
  const cooldownRef = useRef(false)
  const { capture } = useStealthCapture(videoRef)

  useEffect(() => {
    requestWakeLock()

    let stream = null
    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then((s) => {
        stream = s
        if (videoRef.current) {
          videoRef.current.srcObject = s
          videoRef.current.play()
        }
      })
      .catch(() => setStatus('error'))

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const handleCapture = async () => {
    if (cooldownRef.current || status === 'processing') return

    navigator.vibrate?.(50)
    cooldownRef.current = true
    setStatus('processing')

    try {
      await updateStatus(sessionId, 'processing')

      const base64 = capture()
      if (!base64) throw new Error('Capture failed')

      const answer = await solveQuestion(base64)

      await pushAnswer(sessionId, {
        result: answer,
        timestamp: Date.now(),
      })

      setStatus('ready')
    } catch {
      navigator.vibrate?.([100, 50, 100])
      setStatus('error')

      try {
        await pushAnswer(sessionId, {
          result: 'Lỗi mạng, chụp lại',
          timestamp: Date.now(),
        })
      } catch {}

      setTimeout(() => setStatus('ready'), 3000)
    }

    setTimeout(() => {
      cooldownRef.current = false
    }, 1800)
  }

  const dotColor = { ready: '#00FF00', processing: '#FFA500', error: '#FF0000' }[status]
  const dotGlow = { ready: '#00FF0066', processing: '#FFA50066', error: '#FF000066' }[status]

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'fixed',
          top: '14px',
          right: '14px',
          zIndex: 30,
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 8px 2px ${dotGlow}`,
          transition: 'background 0.25s, box-shadow 0.25s',
          animation: status === 'processing' ? 'pulse-dot 0.8s infinite' : 'none',
        }}
      />

      <button
        onClick={onBack}
        style={{
          position: 'fixed',
          top: '8px',
          left: '8px',
          zIndex: 30,
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: 'rgba(255,255,255,0.25)',
          fontSize: '10px',
          padding: '5px 9px',
          fontFamily: "'JetBrains Mono', monospace",
          cursor: 'pointer',
          borderRadius: '4px',
          letterSpacing: '1px',
        }}
      >
        ←
      </button>

      <div
        style={{
          position: 'fixed',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 30,
          fontSize: '10px',
          color: '#555',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '4px',
          background: 'rgba(0,0,0,0.5)',
          padding: '4px 10px',
          borderRadius: '4px',
        }}
      >
        {sessionId}
      </div>

      <div
        style={{
          position: 'fixed',
          top: '22%',
          left: '50%',
          transform: 'translate(-50%, 0)',
          zIndex: 5,
          pointerEvents: 'none',
          width: '60vw',
          maxWidth: '280px',
          aspectRatio: '4/3',
        }}
      >
        {[
          { top: 0, left: 0, borderTop: true, borderLeft: true },
          { top: 0, right: 0, borderTop: true, borderRight: true },
          { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
          { bottom: 0, right: 0, borderBottom: true, borderRight: true },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: c.top !== undefined ? c.top : undefined,
              bottom: c.bottom !== undefined ? c.bottom : undefined,
              left: c.left !== undefined ? c.left : undefined,
              right: c.right !== undefined ? c.right : undefined,
              width: 22,
              height: 22,
              borderTop: c.borderTop ? '1.5px solid rgba(255,255,255,0.25)' : undefined,
              borderBottom: c.borderBottom ? '1.5px solid rgba(255,255,255,0.25)' : undefined,
              borderLeft: c.borderLeft ? '1.5px solid rgba(255,255,255,0.25)' : undefined,
              borderRight: c.borderRight ? '1.5px solid rgba(255,255,255,0.25)' : undefined,
            }}
          />
        ))}
      </div>

      {status === 'processing' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 8,
            background:
              'linear-gradient(to bottom, transparent 48%, rgba(255,165,0,0.04) 50%, transparent 52%)',
            pointerEvents: 'none',
            animation: 'scan 1.2s linear infinite',
          }}
        />
      )}

      <div
        onPointerDown={handleCapture}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '40vh',
          background: 'transparent',
          zIndex: 20,
        }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: '8vh',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          opacity: status === 'ready' ? 0.35 : 0,
          transition: 'opacity 0.4s',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.4)',
            animation: 'blink 2s infinite',
          }}
        />
        <div
          style={{
            fontSize: '9px',
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '3px',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          CHẠM ĐỂ CHỤP
        </div>
      </div>
    </div>
  )
}
