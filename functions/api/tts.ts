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

    // 角色设定：使用 systemInstruction 设定专业播音员角色
    // 增加对多音字、停顿和语调的明确要求，以提高朗读准确率
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        systemInstruction: `你是一位顶级的中文播音主持专家。
请用标准、圆润、富有文学感染力的播音腔朗读。
特别注意：
1. 准确处理多音字（如“向里以明界”中的“为”等，根据语境判断读音）。
2. 逻辑停顿自然，长句要根据语义合理断句。
3. 语速适中，重音突出，展现出文学作品的深度与美感。
4. 只输出音频，严禁生成任何文本回复。`,
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // 'Zephyr' 声音稳定，适合长文本
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
