import { GoogleGenAI } from "@google/genai";

export const onRequestPost = async (context: any) => {
  const { env, request } = context;
  const rawKeys = env.GEMINI_API_KEY || "";
  const keys = rawKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  
  if (keys.length === 0) return new Response(JSON.stringify({ error: "API Key missing" }), { status: 500 });
  const apiKey = keys[Math.floor(Math.random() * keys.length)];

  try {
    const { essayText, title } = await request.json();
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `你是一位语文阅卷组组长。请对以下题目为《${title}》的作文进行“升格”处理。
    学生原文：
    ${essayText}
    
    任务：
    1. 生成一篇“升格版”范文（约 800 字），要求立意更深、语言更精练、素材更丰富。
    2. 详细列出“升格亮点”：说明在哪些地方进行了修改，使用了什么修辞或名言，提升了什么境界。
    3. 请使用 Markdown 格式输出。`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
