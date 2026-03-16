import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { student } = await request.json();
    const genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `你是一位资深的语文教育专家。请根据以下学生的考试数据进行深度学情分析，并给出具体的提升建议。
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
    4. 针对性提升方案（分阶段、可操作）`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return new Response(JSON.stringify({ analysis: text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
