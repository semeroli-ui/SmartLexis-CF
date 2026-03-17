import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { student } = await request.json();
    
    // 处理多个 API Key
    const keys = env.GEMINI_API_KEY.split(',').map(k => k.trim());
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    
    const genAI = new GoogleGenAI({ apiKey });
    
    // 使用 Gemini 3 Pro 模型
    const response = await genAI.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `你是一位资深的语文教育专家。请根据以下学生的考试数据进行深度学情分析，并给出具体的提升建议。
      学生姓名：${student.name}
      各项得分：
      - 选择题：${student.choice}/30
      - 现代文阅读：${student.modernReading}/30
      - 文言文阅读：${student.classicReading}/20
      - 非连续性文本：${student.nonLinear}/10
      - 默写填空：${student.dictation}/10
      - 作文：${student.composition}/50
      总分：${student.total}/150

      请以 Markdown 格式输出，包含：
      1. 总体评价
      2. 优势分析
      3. 薄弱环节
      4. 针对性提升方案（分阶段、可操作）`,
    });

    return new Response(JSON.stringify({ analysis: response.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
