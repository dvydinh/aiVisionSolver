import { useState, useEffect, useCallback, useRef } from 'react'
import { subscribeToSession } from '../services/databaseService'

export default function DisplayView({ sessionId, onBack }) {
  const [displayState, setDisplayState] = useState('waiting')
  const [answer, setAnswer] = useState('')
  const [visible, setVisible] = useState(true)
  const lastTimestampRef = useRef(0)

  const transitionTo = useCallback((newState, newAnswer = '') => {
    setVisible(false)
    setTimeout(() => {
      setDisplayState(newState)
      setAnswer(newAnswer)
      setVisible(true)
    }, 180)
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToSession(sessionId, (data) => {
      if (data.timestamp && data.timestamp <= lastTimestampRef.current) return
      lastTimestampRef.current = data.timestamp || 0

      if (data.status === 'processing') {
        transitionTo('processing')
      } else if (data.result === '?') {
        transitionTo('error', '?')
      } else if (data.status === 'done' && data.result) {
        transitionTo('answer', data.result)
      }
    })

    return () => unsubscribe()
  }, [sessionId, transitionTo])

  const getAnswerStyle = () => {
    const len = answer.length
    if (len === 1) {
      return {
        fontSize: '35vh',
        fontWeight: 900,
        color: '#FFD700',
        lineHeight: 1,
        fontFamily: "'Inter', sans-serif",
      }
    }
    if (len <= 6) {
      return {
        fontSize: '18vh',
        fontWeight: 800,
        color: '#FFFFFF',
        lineHeight: 1.05,
        fontFamily: "'Inter', sans-serif",
      }
    }
    if (len <= 15) {
      return {
        fontSize: '10vh',
        fontWeight: 700,
        color: '#FFFFFF',
        lineHeight: 1.15,
        fontFamily: "'Inter', sans-serif",
      }
    }
    if (len <= 35) {
      return {
        fontSize: '6.5vh',
        fontWeight: 700,
        color: '#FFFFFF',
        lineHeight: 1.25,
        fontFamily: "'Inter', sans-serif",
      }
    }
    return {
      fontSize: '4.5vh',
      fontWeight: 600,
      color: '#FFFFFF',
      lineHeight: 1.35,
      fontFamily: "'Inter', sans-serif",
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#000000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5vw',
      }}
    >
      <button
        onClick={onBack}
        style={{
          position: 'fixed',
          top: '8px',
          left: '8px',
          background: 'transparent',
          border: '1px solid #111',
          color: '#666',
          fontSize: '10px',
          padding: '5px 9px',
          fontFamily: "'JetBrains Mono', monospace",
          cursor: 'pointer',
          borderRadius: '4px',
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
          fontSize: '10px',
          color: '#555',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '4px',
        }}
      >
        {sessionId}
      </div>

      <div
        style={{
          width: '100%',
          textAlign: 'center',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out',
        }}
      >
        {displayState === 'waiting' && (
          <div
            style={{
              fontSize: '3vh',
              color: '#555',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '4px',
              animation: 'blink 2.4s ease-in-out infinite',
            }}
          >
            [ CHỜ... ]
          </div>
        )}

        {displayState === 'processing' && (
          <div
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '4vh',
              color: '#777',
              letterSpacing: '3px',
              animation: 'blink 0.9s ease-in-out infinite',
            }}
          >
            Đang nạp...
          </div>
        )}

        {displayState === 'answer' && (
          <div
            style={{
              ...getAnswerStyle(),
              wordBreak: 'break-word',
              maxWidth: '92vw',
              margin: '0 auto',
              animation: 'fade-in 0.25s ease-out',
            }}
          >
            {answer}
          </div>
        )}

        {displayState === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2vh' }}>
            <div
              style={{
                fontSize: '22vh',
                fontWeight: 900,
                color: '#FF4444',
                lineHeight: 1,
                fontFamily: "'Inter', sans-serif",
                animation: 'fade-in 0.2s ease-out',
              }}
            >
              ?
            </div>
            <div
              style={{
                fontSize: '1.8vh',
                color: '#777',
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '2px',
              }}
            >
              Mờ/Không rõ. Chụp lại.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
