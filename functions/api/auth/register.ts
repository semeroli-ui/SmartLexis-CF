export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { email, password, name, role, studentId } = await request.json();
    const uid = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await env.DB.prepare(
      "INSERT INTO users (uid, email, password, name, role, studentId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).bind(uid, email, password, name, role, studentId || null, createdAt).run();

    const user = { uid, email, name, role, studentId };
    return new Response(JSON.stringify(user), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err.message.includes("UNIQUE constraint failed")) {
      return new Response(JSON.stringify({ error: "该邮箱已被注册" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
