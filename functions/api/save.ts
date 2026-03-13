export const onRequest = async (context: any) => {
  const { env, request } = context;
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 数据库未配置，请在 Cloudflare 控制台绑定数据库。" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  try {
    const data = await request.json();
    const { studentId, title, transcription, analysis, score } = data;

    // 使用全新的表名 writing_records 以避免旧表的约束冲突
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS writing_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id TEXT NOT NULL,
          essay_title TEXT NOT NULL,
          transcription TEXT,
          analysis_content TEXT NOT NULL,
          score INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await env.DB.prepare(
        "INSERT INTO writing_records (student_id, essay_title, transcription, analysis_content, score) VALUES (?, ?, ?, ?, ?)"
      ).bind(studentId, title, transcription, analysis, score).run();
    } catch (dbErr: any) {
      console.error("D1 Insert Error:", dbErr.message);
      throw dbErr;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
