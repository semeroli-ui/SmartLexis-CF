import { GoogleGenAI } from "@google/genai";

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { student } = await request.json();
    const s = student || {};
    
    // 识别弱项逻辑
    const weakPoints = [];
    if ((s.classicReading || 0) < 12) weakPoints.push("文言文阅读理解");
    if ((s.modernReading || 0) < 20) weakPoints.push("现代文深度鉴赏");
    if ((s.composition || 0) < 35) weakPoints.push("作文立意与素材运用");
    if ((s.dictation || 0) < 8) weakPoints.push("名句名篇默写");
    if ((s.nonLinear || 0) < 7) weakPoints.push("非连续性文本分析");

    const focusArea = weakPoints.length > 0 ? weakPoints.join('、') : "语文综合素养提升";

    const keys = env.GEMINI_API_KEY.split(',').map(k => k.trim());
    const apiKey = keys[Math.floor(Math.random() * keys.length)];
    const genAI = new GoogleGenAI({ apiKey });

    const prompt = `你是一位资深的语文特级教师。根据该学生的考试表现（重点提升：${focusArea}），请生成一份“专项练习”试题集。
    
    请严格按照以下 JSON 格式返回练习内容，不要包含任何其他文字：
    {
      "title": "专项提分练习标题",
      "introduction": "练习说明和鼓励语",
      "reading_material": "阅读材料内容",
      "questions": [
        {
          "id": 1,
          "type": "choice",
          "content": "题目内容",
          "options": ["A. 选项1", "B. 选项2", "C. 选项3", "D. 选项4"],
          "answer": "A",
          "analysis": "题目解析"
        }
      ],
      "writing_task": {
        "title": "写作练习题目",
        "requirement": "写作要求",
        "guidance": "写作指导"
      }
    }
    
    要求：
    1. 题目要具有针对性，紧扣薄弱环节。
    2. 难度适中，符合高考/中考水平。
    3. 必须返回合法的 JSON 格式。`;

    const response = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    return new Response(response.text, {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
