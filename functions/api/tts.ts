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
    const cleanText = text.replace(/[#*`>]/g, '');
    
    const ttsPrompt = `你现在是一位专业的广播电视主持人。请用标准、优美、富有情感的普通话朗读以下范文。
要求：语速自然，抑扬顿挫，在抒情处婉转，在议论处有力，让学生感受到文字的魅力。

范文内容如下：
${cleanText}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ 
          text: ttsPrompt 
        }] 
      }],
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
      return new Response(JSON.stringify({ error: "AI 未能生成音频数据，请稍后重试。" }), { status: 500 });
    }

    // Gemini returns raw PCM (16-bit, 24kHz, Mono) for Modality.AUDIO
    const binaryString = atob(base64Audio);
    const pcmData = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      pcmData[i] = binaryString.charCodeAt(i);
    }

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

    // Efficient base64 conversion for Cloudflare Workers
    const base64Encode = (uint8Array: Uint8Array) => {
      let result = '';
      const len = uint8Array.length;
      const step = 1024; // Process in smaller steps to avoid stack issues
      for (let i = 0; i < len; i += step) {
        const end = Math.min(i + step, len);
        result += String.fromCharCode.apply(null, uint8Array.subarray(i, end) as any);
      }
      return btoa(result);
    };

    const finalBase64 = base64Encode(combined);

    return new Response(JSON.stringify({ audio: finalBase64 }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("TTS API Error:", err);
    return new Response(JSON.stringify({ 
      error: err.message,
      details: "请检查 GEMINI_API_KEY 是否正确配置。如果问题持续，可能是模型服务暂时不可用。"
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
