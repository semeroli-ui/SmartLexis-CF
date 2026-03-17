import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const formData = await request.formData();
    const title = formData.get('title');
    const studentId = formData.get('studentId');
    const teacherId = formData.get('teacherId'); // 新增
    const images = formData.getAll('images');

    if (!teacherId) {
      return new Response(JSON.stringify({ error: "Missing teacherId" }), { status: 400 });
    }

    // 确保表存在
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS writing_records (
        id TEXT PRIMARY KEY,
        studentId TEXT,
        teacherId TEXT,
        title TEXT,
        analysis TEXT,
        date DATETIME
      )
    `).run();

    // 处理多个 API Key
    const keys = env.GEMINI_API_KEY.split(',').map(k => k.trim());
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    
    const genAI = new GoogleGenAI({ apiKey });

    const parts: any[] = [
      { text: `你是一位资深的语文阅卷组组长。请对这篇题目为《${title}》的学生手写作文进行深度诊断。
      要求：
      1. 识别图片中的文字内容（如果清晰）。
      2. 从“立意深度”、“结构安排”、“语言表达”、“卷面书写”四个维度进行评分（满分50）。
      3. 给出具体的“升格建议”（即如何修改能拿到更高分）。
      请使用 Markdown 格式输出。` }
    ];

    for (const imgBase64 of images) {
      const base64Data = imgBase64.split(',')[1];
      const mimeType = imgBase64.split(',')[0].split(':')[1].split(';')[0];
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: { parts },
    });

    const analysis = response.text;
    const id = crypto.randomUUID();
    const date = new Date().toISOString();

    // 保存到 D1 数据库
    await env.DB.prepare(
      "INSERT INTO writing_records (id, studentId, teacherId, title, analysis, date) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(id, studentId, teacherId, title, analysis, date).run();

    return new Response(JSON.stringify({ id, title, analysis, date }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
