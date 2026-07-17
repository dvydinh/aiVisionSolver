import { useState, useEffect } from 'react'

export async function requestOrientationPermission() {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    try {
      await DeviceOrientationEvent.requestPermission()
    } catch (e) {}
  }
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      await DeviceMotionEvent.requestPermission()
    } catch (e) {}
  }
}

export function useGravityRotation() {
  const [rotation, setRotation] = useState(0)

  useEffect(() => {
    const handleMotion = (event) => {
      const accel = event.accelerationIncludingGravity
      if (!accel || accel.x === null || accel.y === null) return

      let { x, y } = accel

      // iOS Safari đảo ngược dấu của cảm biến gia tốc so với chuẩn W3C (Android)
      // Ta cần chuẩn hóa dữ liệu của iOS về giống Android (W3C)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      if (isIOS) {
        x = -x
        y = -y
      }

      // Bỏ qua nếu điện thoại úp hoặc ngửa hoàn toàn (z = 9.8) để tránh nhiễu
      // Nhưng nếu hơi nghiêng một chút thì vẫn lấy x, y để tính toán
      if (Math.abs(x) < 2 && Math.abs(y) < 2) return

      if (Math.abs(x) > Math.abs(y)) {
        // Trọng lực kéo theo trục X -> Điện thoại đang nằm ngang
        if (x > 0) setRotation(-90) // Quay trái (W3C chuẩn: x > 0)
        else setRotation(90) // Quay phải
      } else {
        // Trọng lực kéo theo trục Y -> Điện thoại đang nằm dọc
        if (y < 0) setRotation(180) // Ngược (W3C chuẩn: y < 0)
        else setRotation(0) // Thẳng (W3C chuẩn: y > 0)
      }
    }

    window.addEventListener('devicemotion', handleMotion)
    return () => window.removeEventListener('devicemotion', handleMotion)
  }, [])

  return rotation
}
