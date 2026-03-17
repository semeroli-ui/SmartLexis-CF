export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");
  const teacherId = url.searchParams.get("teacherId");

  if (!studentId || !teacherId) {
    return new Response(JSON.stringify({ error: "Missing studentId or teacherId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // 确保表存在并包含必要列
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

    const tableInfo = await env.DB.prepare("PRAGMA table_info(writing_records)").all();
    const columns = tableInfo.results.map(c => c.name);
    if (!columns.includes('teacherId')) {
      await env.DB.prepare("ALTER TABLE writing_records ADD COLUMN teacherId TEXT").run().catch(() => {});
    }
    if (!columns.includes('studentId')) {
      await env.DB.prepare("ALTER TABLE writing_records ADD COLUMN studentId TEXT").run().catch(() => {});
    }

    const { results } = await env.DB.prepare(
      "SELECT * FROM writing_records WHERE studentId = ? AND teacherId = ? ORDER BY date DESC"
    ).bind(studentId, teacherId).all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
