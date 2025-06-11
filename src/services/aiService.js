const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const SYSTEM_PROMPT = `Đây là bức ảnh chụp một câu hỏi. Nhiệm vụ của bạn:
- Nếu là TRẮC NGHIỆM (A, B, C, D): Định dạng bắt buộc là "Chữ cái. Nội dung đáp án" (VD: "A. 15" hoặc "C. Hàm liên tục").
- Nếu là TỰ LUẬN / BÀI TẬP: Chỉ in ra kết quả cuối cùng hoặc đáp án ngắn gọn nhất.
- Nếu là code LEETCODE / THUẬT TOÁN: Chỉ in ra khối code giải quyết bài toán.
TUYỆT ĐỐI KHÔNG lặp lại câu hỏi, KHÔNG có lời dẫn (như "Đáp án là", "Đây là code"), KHÔNG giải thích lằng nhằng. Nếu không thấy chữ, in '?'.`

const MODELS_SMART_TO_DUMB = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite'
]

export async function solveQuestion(base64Image) {
  const apiKey = (GEMINI_API_KEY || '').trim()
  let lastError = null

  for (const model of MODELS_SMART_TO_DUMB) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: SYSTEM_PROMPT },
                  { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                ],
              },
            ],
            // Nâng giới hạn token lên 1500 để đủ xuất code LeetCode
            generationConfig: { maxOutputTokens: 1500 },
          }),
        }
      )

      if (!resp.ok) {
        const errText = await resp.text()
        lastError = `API ${resp.status} (${model}): ${errText.substring(0, 20)}`
        // Nếu lỗi do hết token (429), model không tồn tại (404) hoặc bảo trì (503), thì thử model tiếp theo
        if (resp.status === 429 || resp.status === 404 || resp.status === 503) {
          continue
        } else {
          // Lỗi sai key (403) hoặc ảnh hỏng (400) thì dừng luôn
          return lastError
        }
      }

      const data = await resp.json()
      if (!data.candidates || data.candidates.length === 0) {
        if (data.promptFeedback?.blockReason) return 'Bị chặn (Safety)'
        return 'No Response'
      }
      return data.candidates[0]?.content?.parts?.[0]?.text?.trim() || '?'
    } catch (error) {
      lastError = `Lỗi (${model}): ${error.message.substring(0, 20)}`
      // Lỗi mạng, tiếp tục thử model khác
      continue
    }
  }

  return lastError || 'Tất cả model đều sập/hết token'
}
