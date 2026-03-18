import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { student } = await request.json();
    const s = student || {};
    
    // 识别弱项逻辑
    const weakPoints = [];
    if ((s.classicReading || 0) < 12) weakPoints.push("文言文阅读理解");
    if ((s.modernReading || 0) < 20) weakPoints.push("现代文深度鉴赏");
    if ((s.composition || 0) < 35) weakPoints.push("作文立意与素材运用");
    if ((s.dictation || 0) < 8) weakPoints.push("名句名篇默写");
    if ((s.nonLinear || 0) < 7) weakPoints.push("非连续性文本分析");

    const focusArea = weakPoints.length > 0 ? weakPoints.join('、') : "语文综合素养提升";

    const keys = env.GEMINI_API_KEY.split(',').map(k => k.trim());
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `你是一位资深的语文特级教师。根据该学生的考试表现（重点提升：${focusArea}），请生成一份“专项练习”试题集。
    要求：
    1. 包含 1 段针对性阅读材料（约 300-500 字）。
    2. 包含 3-5 道高质量的选择题或简答题。
    3. 包含 详细的参考答案与解析。
    4. 格式必须是清晰的 Markdown。
    5. 难度适配中高考水平。`;

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
