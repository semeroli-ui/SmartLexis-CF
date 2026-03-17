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

    // 角色设定：专业电视台播音员
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: { 
        parts: [{ 
          text: `你现在是一位专业的电视台新闻主播或电台播音员。请用字正腔圆、情感饱满、富有感染力的播音腔朗读以下范文。要求语速适中，重音自然，展现出文学作品的韵味：\n\n${text}` 
        }] 
      },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
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
