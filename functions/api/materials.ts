export async function onRequest(context) {
  const { env, request } = context;
  const method = request.method;

  if (!env.DB) {
    return new Response(JSON.stringify({ error: "数据库未绑定" }), { status: 500 });
  }

  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS writing_materials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        content TEXT,
        theme TEXT,
        source_title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    const url = new URL(request.url);
    const studentId = url.searchParams.get("student_id");

    if (method === "GET") {
      if (!studentId) return new Response(JSON.stringify([]), { status: 200 });
      const { results } = await env.DB.prepare("SELECT * FROM writing_materials WHERE student_id = ? ORDER BY created_at DESC").bind(studentId).all();
      return new Response(JSON.stringify(results || []), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      const { student_id, content, theme, source_title } = await request.json();
      if (!student_id || !content) {
        return new Response(JSON.stringify({ error: "缺少必要参数" }), { status: 400 });
      }

      await env.DB.prepare(`
        INSERT INTO writing_materials (student_id, content, theme, source_title)
        VALUES (?, ?, ?, ?)
      `).bind(student_id, content, theme || "其他", source_title || "未知").run();

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE") {
      const id = url.searchParams.get("id");
      if (!id) return new Response(JSON.stringify({ error: "缺少ID" }), { status: 400 });
      await env.DB.prepare("DELETE FROM writing_materials WHERE id = ?").bind(id).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
