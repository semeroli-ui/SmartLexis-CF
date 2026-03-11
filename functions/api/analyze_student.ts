import { GoogleGenAI } from "@google/genai";

export const onRequestPost = async (context: any) => {
  const { env, request } = context;
  const apiKey = env.GEMINI_API_KEY;

  if (!apiKey) return new Response(JSON.stringify({ error: "API Key missing" }), { status: 500 });

  try {
    const { student } = await request.json();
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你是一位资深的语文教育专家。请根据以下学生的考试数据，提供一份详细的学情诊断和学习建议（约300字）。
      学生姓名：${student.name}
      总分：${student.total} / 150
      各项得分：
      - 选择题：${student.choice} / 30
      - 现代文阅读：${student.modernReading} / 30
      - 文言文阅读：${student.classicReading} / 20
      - 非连续性文本：${student.nonLinear} / 10
      - 默写填空：${student.dictation} / 10
      - 作文：${student.composition} / 50
      请从核心素养（语言建构、思维发展、审美鉴赏、文化传承、表达创作）的角度进行分析，并给出具体的提升路径。请使用 Markdown 格式。`,
    });

    return new Response(JSON.stringify({ text: response.text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
