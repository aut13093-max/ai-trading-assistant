
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
  }

  try {
    const { symbol, price, trend, structure } = req.body || {};

    if (!symbol || !Number.isFinite(Number(price))) {
      return res.status(400).json({ error: "Please provide a valid symbol and price" });
    }

    const prompt = `
你是一名谨慎的外汇与黄金市场分析助手。
请用中文分析，不要编造实时数据。

品种：${symbol}
价格：${price}
方向：${trend || "不确定"}
结构：${structure || "结构不清晰"}

请说明：
1. 市场情境
2. 多空条件和确认信号
3. 失效条件
4. 风险控制
5. 结论：等待确认、偏多观察或偏空观察

不要保证盈利；信息不足时请明确说明。
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 800 }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({ error: "Gemini API request failed" });
    }

    const analysis = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n")
      .trim();

    if (!analysis) {
      return res.status(502).json({ error: "Gemini returned an empty analysis" });
    }

    return res.status(200).json({ analysis });
  } catch (error) {
    console.error("Analysis API error:", error);
    return res.status(500).json({ error: "AI analysis failed" });
  }
}
