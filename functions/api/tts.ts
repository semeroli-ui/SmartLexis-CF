import { GoogleGenAI, Modality } from "@google/genai";

export const onRequest = async (context: any) => {
  const { env, request } = context;
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }
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
      contents: [{ 
        parts: [{ 
          text: `你是一位专业的中文播音员，声音温润儒雅，充满书卷气。请用标准普通话、优美的语调和恰当的情感起伏，朗读以下这篇优秀的语文范文。注意语速适中，吐字清晰，在句末和段落间留出自然的停顿，展现出文章的文学韵味和思想深度。

范文内容如下：
${cleanText}` 
        }] 
      }],
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

    if (!base64Audio) {
      return new Response(JSON.stringify({ error: "No audio data received from AI" }), { status: 500 });
    }

    // Gemini TTS returns raw PCM (16-bit, 24kHz, Mono). 
    // We need to wrap it in a WAV header for the browser to play it.
    const pcmData = Uint8Array.from(atob(base64Audio), c => c.charCodeAt(0));
    const wavHeader = new Uint8Array(44);
    const view = new DataView(wavHeader.buffer);
    
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + pcmData.length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, 24000, true); // Sample Rate
    view.setUint32(28, 24000 * 2, true); // Byte Rate
    view.setUint16(32, 2, true); // Block Align
    view.setUint16(34, 16, true); // Bits per Sample
    writeString(36, 'data');
    view.setUint32(40, pcmData.length, true);

    const combined = new Uint8Array(wavHeader.length + pcmData.length);
    combined.set(wavHeader);
    combined.set(pcmData, wavHeader.length);

    const finalBase64 = btoa(Array.from(combined).map(b => String.fromCharCode(b)).join(''));

    return new Response(JSON.stringify({ audio: finalBase64 }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
