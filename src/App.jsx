import { useState, useCallback } from 'react'
import SetupView from './views/SetupView'
import SoloView from './views/SoloView'
import ScannerView from './views/ScannerView'
import DisplayView from './views/DisplayView'

export default function App() {
  const [view, setView] = useState('setup')
  const [sessionId, setSessionId] = useState('')

  const handleStart = useCallback((mode, role, code) => {
    if (mode === 'solo') {
      setView('solo')
      return
    }

    setSessionId(code)
    if (role === 'scanner') {
      setView('scanner')
    } else {
      setView('display')
    }
  }, [])

  const goBack = useCallback(() => setView('setup'), [])

  if (view === 'solo') {
    return <SoloView onBack={goBack} />
  }
  if (view === 'scanner') {
    return <ScannerView sessionId={sessionId} onBack={goBack} />
  }
  if (view === 'display') {
    return <DisplayView sessionId={sessionId} onBack={goBack} />
  }

  return <SetupView onStart={handleStart} />
}
