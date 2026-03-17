export async function onRequest(context) {
  const { env, request } = context;
  const method = request.method;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "数据库未绑定" }), { status: 500 });
  }

  try {
    // 确保表存在且结构正确
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS student_scores (
        student_id TEXT PRIMARY KEY,
        name TEXT,
        choice INTEGER,
        modern_reading INTEGER,
        classic_reading INTEGER,
        non_linear INTEGER,
        dictation INTEGER,
        composition INTEGER,
        total INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    if (method === "GET") {
      const { results } = await env.DB.prepare(
        "SELECT * FROM student_scores ORDER BY updated_at DESC"
      ).all();
      return new Response(JSON.stringify(results || []), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      const students = await request.json();
      if (!Array.isArray(students)) {
        return new Response(JSON.stringify({ error: "数据格式错误" }), { status: 400 });
      }

      // 批量处理
      for (const s of students) {
        await env.DB.prepare(`
          INSERT INTO student_scores (student_id, name, choice, modern_reading, classic_reading, non_linear, dictation, composition, total, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(student_id) DO UPDATE SET
            name = excluded.name,
            choice = excluded.choice,
            modern_reading = excluded.modern_reading,
            classic_reading = excluded.classic_reading,
            non_linear = excluded.non_linear,
            dictation = excluded.dictation,
            composition = excluded.composition,
            total = excluded.total,
            updated_at = CURRENT_TIMESTAMP
        `).bind(s.id, s.name, s.choice, s.modernReading, s.classicReading, s.nonLinear, s.dictation, s.composition, s.total).run();
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE") {
      const body = await request.json();
      const id = body.id;
      if (!id) {
        return new Response(JSON.stringify({ error: "缺少学生ID" }), { status: 400 });
      }
      await env.DB.prepare("DELETE FROM student_scores WHERE student_id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  } catch (err) {
    console.error("Students API Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
