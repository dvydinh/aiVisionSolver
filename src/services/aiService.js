const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const SYSTEM_PROMPT = `Bạn là hệ thống giải bài tự động cực kỳ khô khan.
1. TRẮC NGHIỆM: BẮT BUỘC CHỈ IN RA 1 CHỮ CÁI ĐÁP ÁN ĐÚNG (A, B, C hoặc D). KHÔNG in thêm nội dung đáp án.
2. TỰ LUẬN: Chỉ in ra kết quả cuối cùng.
3. CODE LEETCODE: Chỉ in ra khối code.
TUYỆT ĐỐI KHÔNG giải thích, KHÔNG lặp lại đề, KHÔNG có lời dẫn. Nếu ảnh mờ không đọc được thì in '?'`

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

  // Đưa model đã chạy thành công trước đó lên đầu mâm để khỏi mất công test lại
  let cachedModel = localStorage.getItem('SCANTERM_BEST_MODEL')
  let modelsToTry = [...MODELS_SMART_TO_DUMB]
  if (cachedModel) {
    modelsToTry = [cachedModel, ...modelsToTry.filter(m => m !== cachedModel)]
  }

  for (const model of modelsToTry) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: SYSTEM_PROMPT }]
            },
            contents: [
              {
                parts: [
                  { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
                  { text: "Solve this strictly following system instructions." }
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
          // Xóa cache nếu model đang dùng bị hết token (429) để lần sau nó thử model khác
          if (resp.status === 429 && model === cachedModel) {
            localStorage.removeItem('SCANTERM_BEST_MODEL')
          }
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

      // Đánh dấu model này là ngon lành cành đào để lần sau ưu tiên
      localStorage.setItem('SCANTERM_BEST_MODEL', model)

      return data.candidates[0]?.content?.parts?.[0]?.text?.trim() || '?'
    } catch (error) {
      lastError = `Lỗi (${model}): ${error.message.substring(0, 20)}`
      // Lỗi mạng, tiếp tục thử model khác
      continue
    }
  }

  return lastError || 'Tất cả model đều sập/hết token'
}
