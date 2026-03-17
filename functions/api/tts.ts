import { GoogleGenAI, Modality } from "@google/genai";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { text } = await request.json();
    
    if (!env.GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "未配置 GEMINI_API_KEY 环境变量" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 支持多 Key 轮询（如果有的话）
    const keys = env.GEMINI_API_KEY.split(',').map(k => k.trim());
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    
    const genAI = new GoogleGenAI({ apiKey });

    // 极简指令：避免复杂指令导致预览版模型 500 报错
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `请用专业播音腔朗读以下内容：\n\n${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Zephyr' 在预览版中通常表现最稳定
            prebuiltVoiceConfig: { voiceName: 'Zephyr' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("Gemini 未返回音频数据");
    }

    return new Response(JSON.stringify({ audio: base64Audio }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("TTS API Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
