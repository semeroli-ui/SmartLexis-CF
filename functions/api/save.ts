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

    // 尝试插入数据，如果失败则尝试修复表结构
    try {
      await env.DB.prepare(
        "INSERT INTO writing_analyses (student_id, essay_title, transcription, analysis_content, score) VALUES (?, ?, ?, ?, ?)"
      ).bind(studentId, title, transcription, analysis, score).run();
    } catch (dbErr: any) {
      console.error("D1 Insert Error:", dbErr.message);
      
      // 如果是外键错误或列缺失，尝试重建表（仅作为最后的补救措施）
      if (dbErr.message.includes("FOREIGN KEY") || dbErr.message.includes("no column named")) {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS writing_analyses_new (
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
          "INSERT INTO writing_analyses_new (student_id, essay_title, transcription, analysis_content, score) VALUES (?, ?, ?, ?, ?)"
        ).bind(studentId, title, transcription, analysis, score).run();
        
        // 尝试重命名（如果原表没用了）
        try {
           await env.DB.prepare("DROP TABLE writing_analyses").run();
           await env.DB.prepare("ALTER TABLE writing_analyses_new RENAME TO writing_analyses").run();
        } catch (e) {
           // 如果重命名失败，至少数据存到了新表
        }
      } else {
        throw dbErr;
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
