import { useState, useEffect, useRef } from 'react'
import { useStealthCapture } from '../hooks/useStealthCapture'
import { useGravityRotation } from '../hooks/useGravityRotation'
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
  const [currentModel, setCurrentModel] = useState('')
  const cooldownRef = useRef(false)
  const { capture } = useStealthCapture(videoRef)
  const rotation = useGravityRotation()
  
  const [isLandscape, setIsLandscape] = useState(false)

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
          width: { ideal: 4096 },
          height: { ideal: 2160 },
          advanced: [{ focusMode: 'continuous' }]
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
      const base64 = await capture()
      if (!base64) throw new Error('Capture failed')
      const result = await solveQuestion(base64, (m) => setCurrentModel(m))
      setAnswer(result)
      setStatus('ready')
    } catch (err) {
      navigator.vibrate?.([100, 50, 100])
      setAnswer(`Lỗi: ${err.message}`)
      setStatus('ready')
    }

    setTimeout(() => {
      cooldownRef.current = false
    }, 1800)
  }

  const dotColor = { ready: '#00FF00', processing: '#FFA500', error: '#FF0000' }[status]
  const dotGlow = { ready: '#00FF0066', processing: '#FFA50066', error: '#FF000066' }[status]

  const getAnswerStyle = () => {
    const len = answer.length
    const scale = isLandscape ? 1.5 : 1 // Chữ to hơn nếu ở chế độ landscape

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
        fontSize: `${14 * scale}vh`,
        fontWeight: 500,
        color: '#555',
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 1,
      }
    }

    // MÀU SÁNG (Bright Cyan / Bright Green) cho đáp án
    if (len === 1) {
      return {
        fontSize: `${22 * scale}vh`,
        fontWeight: 900,
        color: '#00FFFF',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1,
      }
    }
    if (len <= 6) {
      return {
        fontSize: `${10 * scale}vh`,
        fontWeight: 800,
        color: '#00FF00',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.05,
      }
    }
    if (len <= 15) {
      return {
        fontSize: `${6 * scale}vh`,
        fontWeight: 700,
        color: '#00FF00',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.15,
      }
    }
    if (len <= 60) {
      return {
        fontSize: `${3.5 * scale}vh`,
        fontWeight: 600,
        color: '#00FF00',
        fontFamily: "'Inter', sans-serif",
        lineHeight: 1.25,
      }
    }
    return {
      fontSize: `${1.8 * scale}vh`,
      fontWeight: 400,
      color: '#00FF00',
      fontFamily: "'JetBrains Mono', monospace",
      lineHeight: 1.4,
    }
  }

  const renderAnswerContent = () => {
    const appliedRotation = isLandscape ? 0 : -rotation
    const isSideways = appliedRotation === 90 || appliedRotation === -90
    const hasText = answer && answer !== '?'

    // Kỹ thuật xoay container và giữ nguyên scroll:
    // Khi xoay 90 độ, width và height phải hoán đổi cho nhau so với khung chứa mẹ.
    // Khung chứa mẹ (Cột đen) có kích thước là 100vw x 40vh (khi màn hình dọc).
    // Nên container chữ phải là 40vh x 100vw.
    const containerStyle = {
      transform: `rotate(${appliedRotation}deg)`,
      transition: 'transform 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: hasText ? 'flex-start' : 'center',
      alignItems: hasText ? 'flex-start' : 'center',
      width: isSideways ? '40vh' : '100%',
      height: isSideways ? '100vw' : '100%',
      position: 'absolute',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '20px',
      boxSizing: 'border-box'
    }

    if (status === 'processing') {
      return (
        <div style={containerStyle}>
          <div style={getAnswerStyle()}>...</div>
          {currentModel && (
            <div style={{
              fontSize: '1.2vh',
              color: '#444',
              marginTop: '8px',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '1px'
            }}>
              [ {currentModel} ]
            </div>
          )}
        </div>
      )
    }
    if (answer) {
      return (
        <div style={containerStyle}>
          <div style={{
            ...getAnswerStyle(),
            wordBreak: 'break-word',
            animation: 'fade-in 0.25s ease-out',
            width: '100%',
            textAlign: 'left'
          }}>
            {answer === '?' ? '[ ? ]' : (
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', tabSize: 4, MozTabSize: 4 }}>{answer}</pre>
            )}
          </div>
        </div>
      )
    }
    return (
      <div style={containerStyle}>
        <div style={{
          fontSize: '9px',
          color: '#555',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '2px',
        }}>
          CHẠM ĐỂ CHỤP
        </div>
      </div>
    )
  }

  return (
    <div 
      onClick={handleCapture}
      style={{ 
        position: 'fixed', inset: 0, background: '#000', overflow: 'hidden',
        display: 'flex', flexDirection: isLandscape ? 'row' : 'column',
        cursor: 'pointer'
      }}
    >
      {/* KHU VỰC CAMERA */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            zIndex: 1,
          }}
        />

        {/* Nút Back */}
        <div style={{
          position: 'absolute',
          top: '8px', left: '8px', zIndex: 30,
          width: '32px', height: '32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '4px', cursor: 'pointer',
        }} onClick={(e) => {
          e.stopPropagation()
          onBack()
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.25)',
            fontSize: '10px',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            ←
          </div>
        </div>

        {/* Chấm Status */}
        <div style={{
          position: 'absolute',
          top: '14px', right: '14px', zIndex: 30,
          width: '9px', height: '9px', borderRadius: '50%',
          background: dotColor,
          boxShadow: `0 0 8px 2px ${dotGlow}`,
          transition: 'background 0.25s, box-shadow 0.25s',
          animation: status === 'processing' ? 'pulse-dot 0.8s infinite' : 'none',
        }} />

        {/* Viewfinder Bracket */}
        <div style={{
          position: 'absolute',
          top: '18%', left: '50%', transform: 'translate(-50%, 0)', zIndex: 5,
          pointerEvents: 'none', width: '70%', maxWidth: '300px', aspectRatio: '4/3',
        }}>
          {[
            { top: 0, left: 0, borderTop: true, borderLeft: true },
            { top: 0, right: 0, borderTop: true, borderRight: true },
            { bottom: 0, left: 0, borderBottom: true, borderLeft: true },
            { bottom: 0, right: 0, borderBottom: true, borderRight: true },
          ].map((c, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: c.top !== undefined ? c.top : undefined,
              bottom: c.bottom !== undefined ? c.bottom : undefined,
              left: c.left !== undefined ? c.left : undefined,
              right: c.right !== undefined ? c.right : undefined,
              width: 20, height: 20,
              borderTop: c.borderTop ? '1.5px solid rgba(255,255,255,0.2)' : undefined,
              borderBottom: c.borderBottom ? '1.5px solid rgba(255,255,255,0.2)' : undefined,
              borderLeft: c.borderLeft ? '1.5px solid rgba(255,255,255,0.2)' : undefined,
              borderRight: c.borderRight ? '1.5px solid rgba(255,255,255,0.2)' : undefined,
            }} />
          ))}
        </div>

        {status === 'processing' && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 8,
            background: 'linear-gradient(to bottom, transparent 48%, rgba(255,165,0,0.04) 50%, transparent 52%)',
            pointerEvents: 'none', animation: 'scan 1.2s linear infinite',
          }} />
        )}

      </div>

      {/* KHU VỰC CỘT ĐEN ĐÁP ÁN */}
      <div style={{
        width: isLandscape ? '40%' : '100%',
        height: isLandscape ? '100%' : '40%',
        background: '#000',
        borderLeft: isLandscape ? '1px solid #1a1a1a' : 'none',
        borderTop: !isLandscape ? '1px solid #1a1a1a' : 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 25,
        padding: '20px',
        textAlign: 'center',
      }}>
        {renderAnswerContent()}
      </div>
    </div>
  )
}
