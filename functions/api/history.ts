export const onRequest = async (context: any) => {
  const { env, request } = context;
  if (request.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }
  if (!env.DB) {
    return new Response(JSON.stringify({ error: "D1 数据库未配置，请在 Cloudflare 控制台绑定数据库。" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
  const url = new URL(request.url);
  const studentId = url.searchParams.get("studentId");

  if (!studentId) return new Response("Missing studentId", { status: 400 });

  try {
    // 从 D1 查询最近 10 条记录
    let results;
    try {
      const dbRes = await env.DB.prepare(
        "SELECT id, student_id as studentId, essay_title as title, transcription, analysis_content as analysis, score, created_at as date FROM writing_analyses WHERE student_id = ? ORDER BY created_at DESC LIMIT 10"
      ).bind(studentId).all();
      results = dbRes.results;
    } catch (dbErr: any) {
      // 尝试从新表查询（如果重命名失败了）
      try {
        const dbRes = await env.DB.prepare(
          "SELECT id, student_id as studentId, essay_title as title, transcription, analysis_content as analysis, score, created_at as date FROM writing_analyses_new WHERE student_id = ? ORDER BY created_at DESC LIMIT 10"
        ).bind(studentId).all();
        results = dbRes.results;
      } catch (e) {
        if (dbErr.message.includes("no column named essay_title")) {
          const dbRes = await env.DB.prepare(
            "SELECT id, student_id as studentId, '无标题' as title, transcription, analysis_content as analysis, score, created_at as date FROM writing_analyses WHERE student_id = ? ORDER BY created_at DESC LIMIT 10"
          ).bind(studentId).all();
          results = dbRes.results;
        } else {
          throw dbErr;
        }
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
