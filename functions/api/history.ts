export const onRequestGet = async (context: any) => {
  const { env, request } = context;
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
