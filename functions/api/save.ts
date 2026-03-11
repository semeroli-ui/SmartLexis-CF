export const onRequestPost = async (context: any) => {
  const { env, request } = context;
  try {
    const data = await request.json();
    const { studentId, title, transcription, analysis, score } = data;

    // 将数据插入 D1 数据库
    // 注意：字段名需与您的 schema.sql 保持一致
    await env.DB.prepare(
      "INSERT INTO writing_analyses (student_id, essay_title, transcription, analysis_content, score) VALUES (?, ?, ?, ?, ?)"
    ).bind(studentId, title, transcription, analysis, score).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
