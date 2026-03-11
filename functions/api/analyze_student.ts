import { GoogleGenAI } from "@google/genai";

export const onRequestPost = async (context: any) => {
  const { env, request } = context;
  
  // 处理多 API Key：支持逗号分隔，随机选择一个
  const rawKeys = env.GEMINI_API_KEY || "";
  const keys = rawKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  
  if (keys.length === 0) {
    return new Response(JSON.stringify({ error: "API Key missing" }), { status: 500 });
  }
  
  const apiKey = keys[Math.floor(Math.random() * keys.length)];

  try {
    const { student } = await request.json();
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `分析学生 ${student.name} 的语文成绩：总分 ${student.total}。请给出 300 字以内的 Markdown 格式诊断建议。`,
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
