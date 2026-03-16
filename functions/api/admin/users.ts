export async function onRequestGet(context) {
  const { env } = context;
  try {
    const { results } = await env.DB.prepare(
      "SELECT uid, email, name, role, studentId FROM users"
    ).all();
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

export async function onRequestDelete(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const uid = url.searchParams.get("uid");

  if (!uid) {
    return new Response(JSON.stringify({ error: "Missing uid" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    await env.DB.prepare("DELETE FROM users WHERE uid = ?").bind(uid).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
