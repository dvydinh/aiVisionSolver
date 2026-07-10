import { useCallback } from 'react'

export function useStealthCapture(videoRef) {
  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video) return null

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
    const base64 = dataUrl.split(',')[1]

    canvas.width = 0
    canvas.height = 0

    return base64
  }, [videoRef])

  return { capture }
}
