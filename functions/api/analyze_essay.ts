import { GoogleGenAI } from "@google/genai";

export const onRequestPost = async (context: any) => {
  const { env, request } = context;
  
  // 处理多 API Key：支持逗号分隔，随机选择一个
  const rawKeys = env.GEMINI_API_KEY || "";
  const keys = rawKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  
  if (keys.length === 0) {
    return new Response(JSON.stringify({ error: "API Key missing in environment" }), { status: 500 });
  }
  
  // 随机选择一个 Key
  const apiKey = keys[Math.floor(Math.random() * keys.length)];

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
          { text: `你是一位资深的语文阅卷专家。请对题目为《${title}》的手写作文图片进行深度诊断。请提供：1. 全文转录（OCR）；2. 综合评分（满分50）；3. 维度评价；4. 改进建议。请使用 Markdown 格式。` }
        ]
      }
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message, detail: "Check if your API keys are valid" }), { status: 500 });
  }
};
