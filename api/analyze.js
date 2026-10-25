
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured"
    });
  }

  try {
    const { symbol, price, trend, structure } = req.body || {};

    if (!symbol || !Number.isFinite(Number(price))) {
      return res.status(400).json({
        error: "Please provide a valid symbol and price"
      });
    }

    const prompt = `
你是一名谨慎的外汇与黄金市场分析助手。
请使用中文分析，不要编造实时行情、K线、成交量或新闻。

交易品种：${symbol}
最新价格：${price}
市场方向：${trend || "不确定"}
市场结构：${structure || "结构不清晰"}

请按以下格式回答：
1. 市场情境
2. 多空条件及确认信号
3. 交易判断失效的条件
4. 风险控制与止损注意事项
5. 当前结论：等待确认、偏多观察或偏空观察

不要保证盈利。如果信息不足，请明确说明。
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
        encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 800
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);

      return res.status(502).json({
        error: "Gemini API request failed",
        details:
          data.error?.message ||
          JSON.stringify(data.error || data)
      });
    }

    const analysis = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("\n")
      .trim();

    if (!analysis) {
      return res.status(502).json({
        error: "Gemini returned an empty analysis",
        details: JSON.stringify(data.promptFeedback || data)
      });
    }

    return res.status(200).json({
      analysis
    });

  } catch (error) {
    console.error("Analysis API error:", error);

    return res.status(500).json({
      error: "AI analysis failed",
      details: error.message || "Unknown server error"
    });
  }
}
