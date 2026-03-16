export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { email, password } = await request.json();
    const user = await env.DB.prepare(
      "SELECT * FROM users WHERE email = ? AND password = ?"
    ).bind(email, password).first();

    if (!user) {
      return new Response(JSON.stringify({ error: "邮箱或密码错误" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(user), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
