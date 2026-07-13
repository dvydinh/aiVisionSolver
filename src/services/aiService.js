const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const SYSTEM_PROMPT = `Đây là bức ảnh chụp một câu hỏi. Nhiệm vụ của bạn:
- Nếu là TRẮC NGHIỆM (A, B, C, D): Định dạng bắt buộc là "Chữ cái. Nội dung đáp án" (VD: "A. 15" hoặc "C. Hàm liên tục").
- Nếu là TỰ LUẬN / BÀI TẬP: Chỉ in ra kết quả cuối cùng hoặc đáp án ngắn gọn nhất.
- Nếu là code LEETCODE / THUẬT TOÁN: Chỉ in ra khối code giải quyết bài toán.
TUYỆT ĐỐI KHÔNG lặp lại câu hỏi, KHÔNG có lời dẫn (như "Đáp án là", "Đây là code"), KHÔNG giải thích lằng nhằng. Nếu không thấy chữ, in '?'.`

export async function solveQuestion(base64Image) {
  try {
    const apiKey = (GEMINI_API_KEY || '').trim()
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${apiKey}`,
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
          generationConfig: { maxOutputTokens: 50 },
        }),
      }
    )

    if (!resp.ok) {
      const errText = await resp.text()
      return `API ${resp.status}: ${errText.substring(0, 20)}`
    }

    const data = await resp.json()
    if (!data.candidates || data.candidates.length === 0) {
      if (data.promptFeedback?.blockReason) return 'Bị chặn (Safety)'
      return 'No Response'
    }
    return data.candidates[0]?.content?.parts?.[0]?.text?.trim() || '?'
  } catch (error) {
    return `Lỗi: ${error.message.substring(0, 20)}`
  }
}
