import { useCallback } from 'react'

export function useStealthCapture(videoRef) {
  const capture = useCallback(async () => {
    if (!videoRef.current) return null
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    
    // Kích thước 1920px (Full HD) giúp chống mờ khi chụp code chữ nhỏ li ti trên màn hình máy tính
    const MAX_DIM = 1920
    let width = video.videoWidth || 1920
    let height = video.videoHeight || 1080
    
    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.floor(height * (MAX_DIM / width))
        width = MAX_DIM
      } else {
        width = Math.floor(width * (MAX_DIM / height))
        height = MAX_DIM
      }
    }
    
    canvas.width = width
    canvas.height = height

    // Nhường luồng chính (Main thread) để React kịp render trạng thái loading trước khi chạy tác vụ nặng
    await new Promise(r => setTimeout(r, 10))

    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, width, height)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const base64 = dataUrl.split(',')[1]

    canvas.width = 0
    canvas.height = 0
    return base64
  }, [videoRef])

  return { capture }
}
