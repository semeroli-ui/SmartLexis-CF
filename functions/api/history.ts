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
    const { results } = await env.DB.prepare(
      "SELECT id, student_id as studentId, essay_title as title, transcription, analysis_content as analysis, score, created_at as date FROM writing_analyses WHERE student_id = ? ORDER BY created_at DESC LIMIT 10"
    ).bind(studentId).all();

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
