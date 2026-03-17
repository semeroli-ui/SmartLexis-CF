export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { email, password } = await request.json();

    // 自动初始化：如果数据库一个用户都没有，自动创建一个默认管理员
    const countResult = await env.DB.prepare("SELECT COUNT(*) as count FROM users").first();
    if (countResult && countResult.count === 0) {
      const adminUid = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO users (uid, email, password, name, role, createdAt) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(adminUid, 'admin@lexis.com', 'admin123', '系统管理员', 'admin', new Date().toISOString()).run();
    }

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
