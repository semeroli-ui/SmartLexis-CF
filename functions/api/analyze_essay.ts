import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const formData = await request.formData();
    const title = formData.get('title');
    const studentId = formData.get('studentId');
    const teacherId = formData.get('teacherId');
    const analysis = formData.get('analysis');

    if (!teacherId || !analysis) {
      return new Response(JSON.stringify({ error: "Missing teacherId or analysis" }), { status: 400 });
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

    // 检查并修复表结构
    const tableInfo = await env.DB.prepare("PRAGMA table_info(writing_records)").all();
    const columns = tableInfo.results.map(column => column.name);
    
    if (!columns.includes('teacherId')) {
      try {
        await env.DB.prepare("ALTER TABLE writing_records ADD COLUMN teacherId TEXT").run();
      } catch (e) {
        console.error("Error adding teacherId column:", e);
      }
    }
    
    if (!columns.includes('studentId')) {
      try {
        await env.DB.prepare("ALTER TABLE writing_records ADD COLUMN studentId TEXT").run();
      } catch (e) {
        console.error("Error adding studentId column:", e);
      }
    }

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
