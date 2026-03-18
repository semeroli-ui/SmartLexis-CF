import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { title, content } = await request.json();
    const keys = env.GEMINI_API_KEY.split(',').map(k => k.trim());
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    const genAI = new GoogleGenAI({ apiKey });

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你是一位资深的语文特级教师。请对以下作文进行“升格”处理。
      题目：《${title}》
      原文内容：${content}
      
      任务要求：
      1. 创作一篇 800-1000 字的“升格版”范文，要求立意深远、文采斐然、结构严谨。
      2. 详细列出“亮点解析”，说明修改了哪些地方，提升了什么境界。
      3. 从升格范文中挑选 3-5 句“金句”（好词好句），并为每一句标注一个主题标签（如：青春、奋斗、自然、哲思等）。
      
      输出格式：
      【升格范文】
      （此处为范文内容，不少于 800 字）
      
      【亮点解析】
      （此处为解析内容）
      
      【金句推荐】
      - 句子1 | 主题1
      - 句子2 | 主题2`,
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
