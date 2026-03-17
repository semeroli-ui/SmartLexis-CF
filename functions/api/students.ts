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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT,
        teacher_id TEXT,
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
      const url = new URL(request.url);
      const teacherId = url.searchParams.get("teacher_id");
      const isAdmin = url.searchParams.get("is_admin") === "true";

      let query = "SELECT * FROM student_scores";
      let params: any[] = [];

      if (!isAdmin && teacherId) {
        query += " WHERE teacher_id = ?";
        params.push(teacherId);
      }

      query += " ORDER BY updated_at DESC";

      const { results } = await env.DB.prepare(query).bind(...params).all();
      return new Response(JSON.stringify(results || []), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "POST") {
      const { students, teacher_id } = await request.json();
      if (!Array.isArray(students) || !teacher_id) {
        return new Response(JSON.stringify({ error: "数据格式错误或缺少教师ID" }), { status: 400 });
      }

      // 批量处理
      for (const s of students) {
        // 优先通过数据库自增 ID 更新
        if (s.dbId) {
          await env.DB.prepare(`
            UPDATE student_scores SET
              name = ?, choice = ?, modern_reading = ?, classic_reading = ?,
              non_linear = ?, dictation = ?, composition = ?, total = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ? AND teacher_id = ?
          `).bind(s.name, s.choice, s.modernReading, s.classicReading, s.nonLinear, s.dictation, s.composition, s.total, s.dbId, teacher_id).run();
          continue;
        }

        // 如果有 student_id，尝试更新同一教师下的该学生
        if (s.id && s.id !== 'N/A') {
          const existing = await env.DB.prepare(
            "SELECT id FROM student_scores WHERE student_id = ? AND teacher_id = ?"
          ).bind(s.id, teacher_id).first();

          if (existing) {
            await env.DB.prepare(`
              UPDATE student_scores SET
                name = ?, choice = ?, modern_reading = ?, classic_reading = ?,
                non_linear = ?, dictation = ?, composition = ?, total = ?,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = ?
            `).bind(s.name, s.choice, s.modernReading, s.classicReading, s.nonLinear, s.dictation, s.composition, s.total, existing.id).run();
            continue;
          }
        }

        await env.DB.prepare(`
          INSERT INTO student_scores (student_id, teacher_id, name, choice, modern_reading, classic_reading, non_linear, dictation, composition, total, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(s.id || null, teacher_id, s.name, s.choice, s.modernReading, s.classicReading, s.nonLinear, s.dictation, s.composition, s.total).run();
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    if (method === "DELETE") {
      const url = new URL(request.url);
      const id = url.searchParams.get("id"); // 这里的 id 是数据库的自增 id
      const teacherId = url.searchParams.get("teacher_id");
      const isAdmin = url.searchParams.get("is_admin") === "true";

      if (!id) {
        return new Response(JSON.stringify({ error: "缺少记录ID" }), { status: 400 });
      }

      if (isAdmin) {
        await env.DB.prepare("DELETE FROM student_scores WHERE id = ?").bind(id).run();
      } else if (teacherId) {
        await env.DB.prepare("DELETE FROM student_scores WHERE id = ? AND teacher_id = ?").bind(id, teacherId).run();
      } else {
        return new Response(JSON.stringify({ error: "权限不足" }), { status: 403 });
      }

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
