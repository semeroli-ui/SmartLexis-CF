import { GoogleGenAI } from "@google/genai";

export const onRequestPost = async (context: any) => {
  const { env, request } = context;
  const rawKeys = env.GEMINI_API_KEY || "";
  const keys = rawKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  
  if (keys.length === 0) return new Response(JSON.stringify({ error: "API Key missing" }), { status: 500 });
  const apiKey = keys[Math.floor(Math.random() * keys.length)];

  try {
    const { studentScore } = await request.json();
    const ai = new GoogleGenAI({ apiKey });
    
    // Identify weak points based on scores
    const weakPoints = [];
    if (studentScore.classicReading < 12) weakPoints.push("文言文阅读理解");
    if (studentScore.modernReading < 20) weakPoints.push("现代文深度鉴赏");
    if (studentScore.composition < 35) weakPoints.push("作文立意与素材运用");
    if (studentScore.dictation < 8) weakPoints.push("名句名篇默写");
    
    const prompt = `你是一位资深的语文特级教师。根据该学生的考试表现（弱项：${weakPoints.join('、')}），请生成一份“专项练习”试题集。
    要求：
    1. 包含 1 段阅读材料（约 300 字）。
    2. 包含 3 道高质量的选择题或简答题。
    3. 包含 详细的参考答案与解析。
    4. 格式必须是清晰的 Markdown。
    5. 难度适配中高考水平。`;

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
