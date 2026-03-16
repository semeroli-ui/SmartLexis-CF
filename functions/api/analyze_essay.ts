import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const formData = await request.formData();
    const title = formData.get("title");
    const studentId = formData.get("studentId");
    const images = formData.getAll("images"); // Base64 strings

    const genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const parts = [
      { text: `你是一位资深的语文阅卷老师。请对这篇题目为《${title}》的学生手写作文进行深度诊断。
      请先识别图片中的文字，然后从以下维度进行分析：
      1. 审题立意
      2. 结构布局
      3. 语言表达
      4. 书写规范
      最后给出具体的修改建议和预估分数。请以 Markdown 格式输出。` }
    ];

    for (const imgBase64 of images) {
      const base64Data = imgBase64.split(",")[1];
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: "image/jpeg"
        }
      });
    }

    const result = await model.generateContent({ contents: [{ role: "user", parts }] });
    const response = await result.response;
    const text = response.text();

    // Save to D1
    const id = crypto.randomUUID();
    const date = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO writing_records (id, studentId, title, analysis, date) VALUES (?, ?, ?, ?, ?)"
    ).bind(id, studentId, title, text, date).run();

    return new Response(JSON.stringify({ id, title, analysis: text, date }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
