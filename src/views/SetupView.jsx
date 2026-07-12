import { useState } from 'react'
import { createSession, getSession } from '../services/databaseService'
import { requestOrientationPermission } from '../hooks/useGravityRotation'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function SetupView({ onStart }) {
  const [step, setStep] = useState('mode')
  const [selectedRole, setSelectedRole] = useState(null)
  const [generatedCode, setGeneratedCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSelectRole = async (role) => {
    await requestOrientationPermission()
    setSelectedRole(role)
    const code = generateCode()
    setGeneratedCode(code)
    try {
      await createSession(code, role)
    } catch {}
    setStep('code')
  }

  const handleJoin = async () => {
    await requestOrientationPermission()
    if (joinCode.length < 3) return
    setLoading(true)
    setError('')
    try {
      const session = await getSession(joinCode.toUpperCase())
      if (!session) {
        setError('Mã không tồn tại')
        setLoading(false)
        return
      }
      const role = session.creatorRole === 'scanner' ? 'presenter' : 'scanner'
      onStart('pair', role, joinCode.toUpperCase())
    } catch {
      setError('Lỗi kết nối')
      setLoading(false)
    }
  }

  const font = "'JetBrains Mono', monospace"

  const buttonStyle = (active) => ({
    width: '100%',
    maxWidth: '300px',
    padding: '16px',
    background: active ? '#fff' : '#111',
    color: active ? '#000' : '#666',
    border: active ? 'none' : '1px solid #222',
    fontFamily: font,
    fontSize: '11px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  const container = {
    position: 'fixed',
    inset: 0,
    background: '#000',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: font,
    padding: '6vw',
    color: '#fff',
  }

  const header = (
    <>
      <div style={{ fontSize: '10px', color: '#666', letterSpacing: '6px', marginBottom: '8px', textTransform: 'uppercase' }}>
        SCANTERM
      </div>
      <div style={{ width: '32px', height: '1px', background: '#333', marginBottom: '48px' }} />
    </>
  )

  if (step === 'mode') {
    return (
      <div style={container}>
        {header}

        <button onClick={async () => { await requestOrientationPermission(); onStart('solo', null, null); }} style={buttonStyle(true)}>
          1 THIẾT BỊ
        </button>
        <div style={{ fontSize: '8px', color: '#555', letterSpacing: '1px', marginTop: '6px', marginBottom: '24px' }}>
          Chụp và xem đáp án trên cùng màn hình
        </div>

        <button onClick={() => setStep('role')} style={buttonStyle(false)}>
          2 THIẾT BỊ
        </button>
        <div style={{ fontSize: '8px', color: '#555', letterSpacing: '1px', marginTop: '6px', marginBottom: '36px' }}>
          Một máy chụp, một máy hiện đáp án
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px', width: '100%', maxWidth: '300px' }}>
          <div style={{ flex: 1, height: '1px', background: '#222' }} />
          <div style={{ fontSize: '8px', color: '#444', letterSpacing: '2px' }}>HOẶC</div>
          <div style={{ flex: 1, height: '1px', background: '#222' }} />
        </div>

        <div style={{ width: '100%', maxWidth: '300px' }}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
            placeholder="NHẬP MÃ PHIÊN"
            spellCheck={false}
            style={{
              width: '100%',
              background: '#0a0a0a',
              border: '1px solid #222',
              color: '#fff',
              padding: '14px',
              fontFamily: font,
              fontSize: '16px',
              textAlign: 'center',
              letterSpacing: '6px',
              borderRadius: '6px',
              outline: 'none',
              marginBottom: '10px',
            }}
          />
          {error && (
            <div style={{ fontSize: '9px', color: '#FF4444', letterSpacing: '1px', marginBottom: '8px', textAlign: 'center' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleJoin}
            disabled={loading || joinCode.length < 3}
            style={{
              ...buttonStyle(joinCode.length >= 3 && !loading),
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? '...' : 'THAM GIA'}
          </button>
        </div>
      </div>
    )
  }

  if (step === 'role') {
    return (
      <div style={container}>
        {header}

        <div style={{ fontSize: '9px', color: '#777', letterSpacing: '2px', marginBottom: '32px' }}>
          CHỌN VAI TRÒ
        </div>

        <button onClick={() => handleSelectRole('scanner')} style={{ ...buttonStyle(true), marginBottom: '14px' }}>
          MÁY SCAN
        </button>
        <div style={{ fontSize: '8px', color: '#555', letterSpacing: '1px', marginBottom: '28px' }}>
          Chụp ảnh và gửi câu hỏi
        </div>

        <button onClick={() => handleSelectRole('presenter')} style={{ ...buttonStyle(false), marginBottom: '14px' }}>
          MÁY CHIẾU
        </button>
        <div style={{ fontSize: '8px', color: '#555', letterSpacing: '1px', marginBottom: '36px' }}>
          Nhận và hiển thị đáp án
        </div>

        <button
          onClick={() => setStep('mode')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#444',
            fontFamily: font,
            fontSize: '9px',
            letterSpacing: '2px',
            cursor: 'pointer',
          }}
        >
          ← QUAY LẠI
        </button>
      </div>
    )
  }

  if (step === 'code') {
    return (
      <div style={container}>
        {header}

        <div style={{ fontSize: '9px', color: '#777', letterSpacing: '2px', marginBottom: '24px' }}>
          MÃ PHIÊN CỦA BẠN
        </div>

        <div style={{
          fontSize: '42px',
          fontWeight: 700,
          letterSpacing: '16px',
          color: '#fff',
          marginBottom: '16px',
          fontFamily: font,
        }}>
          {generatedCode}
        </div>

        <div style={{ fontSize: '8px', color: '#555', letterSpacing: '1px', marginBottom: '8px', textAlign: 'center', lineHeight: 1.8 }}>
          Nhập mã này trên thiết bị còn lại
        </div>
        <div style={{ fontSize: '8px', color: '#333', letterSpacing: '1px', marginBottom: '40px', textAlign: 'center' }}>
          Vai trò: {selectedRole === 'scanner' ? 'MÁY SCAN' : 'MÁY CHIẾU'}
        </div>

        <button
          onClick={() => onStart('pair', selectedRole, generatedCode)}
          style={buttonStyle(true)}
        >
          BẮT ĐẦU
        </button>

        <button
          onClick={() => setStep('role')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#444',
            fontFamily: font,
            fontSize: '9px',
            letterSpacing: '2px',
            cursor: 'pointer',
            marginTop: '20px',
          }}
        >
          ← QUAY LẠI
        </button>
      </div>
    )
  }

  return null
}
