import { useState, useEffect, useRef } from 'react'
import { useStealthCapture } from '../hooks/useStealthCapture'
import { solveQuestion } from '../services/aiService'

async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      await navigator.wakeLock.request('screen')
    }
  } catch {}
}

export default function SoloView({ onBack }) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('ready')
  const [answer, setAnswer] = useState('')
  const [isLandscape, setIsLandscape] = useState(false)
  const cooldownRef = useRef(false)
  const { capture } = useStealthCapture(videoRef)

  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)')
    setIsLandscape(mq.matches)
    const handler = (e) => setIsLandscape(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

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
      const base64 = capture()
      if (!base64) throw new Error('Capture failed')
      const result = await solveQuestion(base64)
      setAnswer(result)
      setStatus('ready')
    } catch {
      navigator.vibrate?.([100, 50, 100])
      setAnswer('?')
      setStatus('ready')
    }

    setTimeout(() => {
      cooldownRef.current = false
    }, 1800)
  }

  const dotColor = { ready: '#00FF00', processing: '#FFA500', error: '#FF0000' }[status]
  const dotGlow = { ready: '#00FF0066', processing: '#FFA50066', error: '#FF000066' }[status]

  const getAnswerStyle = (landscape) => {
    const len = answer.length
    const scale = landscape ? 0.6 : 1

    if (status === 'processing') {
      return {
        fontSize: `${4 * scale}vh`,
        fontWeight: 600,
        color: '#777',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '3px',
        animation: 'blink 0.9s ease-in-out infinite',
      }
    }

    if (answer === '?') {
      return {
        fontSize: `${18 * scale}vh`,
        fontWeight: 900,
        color: '#FF4444',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1,
      }
    }

    if (len === 1) {
      return {
        fontSize: `${28 * scale}vh`,
        fontWeight: 900,
        color: '#FFD700',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1,
      }
    }
    if (len <= 6) {
      return {
        fontSize: `${14 * scale}vh`,
        fontWeight: 800,
        color: '#FFFFFF',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.05,
      }
    }
    if (len <= 15) {
      return {
        fontSize: `${7 * scale}vh`,
        fontWeight: 700,
        color: '#FFFFFF',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.15,
      }
    }
    if (len <= 35) {
      return {
        fontSize: `${4.5 * scale}vh`,
        fontWeight: 700,
        color: '#FFFFFF',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.25,
      }
    }
    return {
      fontSize: `${3 * scale}vh`,
      fontWeight: 600,
      color: '#FFFFFF',
      fontFamily: "'Inter', sans-serif",
      lineHeight: 1.35,
    }
  }

  const renderAnswerContent = (landscape) => {
    if (status === 'processing') {
      return <div style={getAnswerStyle(landscape)}>...</div>
    }
    if (answer) {
      return (
        <div style={{
          ...getAnswerStyle(landscape),
          wordBreak: 'break-word',
          animation: 'fade-in 0.25s ease-out',
        }}>
          {answer}
        </div>
      )
    }
    return (
      <div style={{
        fontSize: '9px',
        color: '#444',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '2px',
      }}>
        CHẠM ĐỂ CHỤP
      </div>
    )
  }

  const renderViewfinder = () => (
    <div
      style={{
        position: 'absolute',
        top: '18%',
        left: '50%',
        transform: 'translate(-50%, 0)',
        zIndex: 5,
        pointerEvents: 'none',
        width: '55vw',
        maxWidth: '240px',
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
            width: 20,
            height: 20,
            borderTop: c.borderTop ? '1.5px solid rgba(255,255,255,0.2)' : undefined,
            borderBottom: c.borderBottom ? '1.5px solid rgba(255,255,255,0.2)' : undefined,
            borderLeft: c.borderLeft ? '1.5px solid rgba(255,255,255,0.2)' : undefined,
            borderRight: c.borderRight ? '1.5px solid rgba(255,255,255,0.2)' : undefined,
          }}
        />
      ))}
    </div>
  )

  const renderStatusDot = () => (
    <div
      style={{
        position: 'absolute',
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
  )

  const renderBackButton = () => (
    <button
      onClick={onBack}
      style={{
        position: 'absolute',
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
  )

  if (isLandscape) {
    return (
      <div style={{ position: 'fixed', inset: 0, display: 'flex', background: '#000' }}>
        <div
          style={{ flex: 7, position: 'relative', overflow: 'hidden' }}
          onPointerDown={handleCapture}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          {renderBackButton()}
          {renderStatusDot()}
          {renderViewfinder()}

          {status === 'processing' && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 8,
                background: 'linear-gradient(to bottom, transparent 48%, rgba(255,165,0,0.04) 50%, transparent 52%)',
                pointerEvents: 'none',
                animation: 'scan 1.2s linear infinite',
              }}
            />
          )}
        </div>

        <div
          style={{
            flex: 3,
            background: '#0a0a0a',
            borderLeft: '1px solid #1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            textAlign: 'center',
          }}
        >
          {renderAnswerContent(true)}
        </div>
      </div>
    )
  }

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

      {renderBackButton()}
      {renderStatusDot()}
      {renderViewfinder()}

      {status === 'processing' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 8,
            background: 'linear-gradient(to bottom, transparent 48%, rgba(255,165,0,0.04) 50%, transparent 52%)',
            pointerEvents: 'none',
            animation: 'scan 1.2s linear infinite',
          }}
        />
      )}

      <div
        onPointerDown={handleCapture}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: 'calc(100% - 22vh)',
          background: 'transparent',
          zIndex: 20,
        }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '22vh',
          background: 'rgba(0,0,0,0.88)',
          borderTop: '1px solid #1a1a1a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 25,
          padding: '12px 20px',
          textAlign: 'center',
        }}
      >
        {renderAnswerContent(false)}
      </div>
    </div>
  )
}
