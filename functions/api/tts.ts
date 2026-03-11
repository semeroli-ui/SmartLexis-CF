import { GoogleGenAI, Modality } from "@google/genai";

export const onRequestPost = async (context: any) => {
  const { env, request } = context;
  const rawKeys = env.GEMINI_API_KEY || "";
  const keys = rawKeys.split(',').map((k: string) => k.trim()).filter((k: string) => k.length > 0);
  
  if (keys.length === 0) return new Response(JSON.stringify({ error: "API Key missing" }), { status: 500 });
  const apiKey = keys[Math.floor(Math.random() * keys.length)];

  try {
    const { text } = await request.json();
    const ai = new GoogleGenAI({ apiKey });
    
    // Clean text for TTS (remove markdown symbols)
    const cleanText = text.replace(/[#*`>]/g, '').slice(0, 1000);

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `请用标准、富有情感的中文朗读以下范文：${cleanText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is generally good for standard Chinese
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    return new Response(JSON.stringify({ audio: base64Audio }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
