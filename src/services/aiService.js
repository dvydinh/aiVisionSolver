const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const SYSTEM_PROMPT =
  'Bạn là máy giải đề. Nhận diện câu hỏi trong ảnh. ' +
  'Trắc nghiệm -> in 1 chữ cái. Tự luận -> in đáp án cuối cùng. ' +
  'Không từ ngữ thừa, không giải thích. Nếu ảnh không phải câu hỏi, in \'?\'.'

export async function solveQuestion(base64Image) {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: base64Image } },
            ],
          },
        ],
        generationConfig: { maxOutputTokens: 50 },
      }),
    }
  )

  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

  const data = await resp.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '?'
}
