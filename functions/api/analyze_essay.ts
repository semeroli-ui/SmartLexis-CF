import { GoogleGenAI } from "@google/genai";

export const onRequestPost = async (context: any) => {
  const { env, request } = context;
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) return new Response(JSON.stringify({ error: "API Key missing in Cloudflare environment variables" }), { status: 500 });

  try {
    const { images, title } = await request.json();
    const ai = new GoogleGenAI({ apiKey });
    
    const imageParts = images.map((base64: string) => ({
      inlineData: {
        data: base64.split(',')[1],
        mimeType: "image/jpeg"
      }
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          ...imageParts,
          { text: `你是一位资深的语文阅卷专家。请对题目为《${title}》的手写作文图片进行深度诊断。
          
          请严格执行以下任务：
          1. **全文转录 (OCR)**：请务必字斟句酌，完整、准确地转录图片中的所有手写文字。
          2. **综合评分**：满分50分（按中高考作文标准）。
          3. **维度评价**：从立意、结构、语言、素材四个维度进行深度点评。
          4. **改进建议**：给出具体的修改方向和范文参考。
          
          请直接输出 Markdown 格式的诊断报告。` }
        ]
      }
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
