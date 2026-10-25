
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

  const { symbol, price, trend, structure } = req.body || {};

  const allowedSymbols = ["EUR/USD", "USD/JPY", "XAU/USD"];

  if (!allowedSymbols.includes(symbol)) {
    return res.status(400).json({
      error: "Unsupported trading symbol"
    });
  }

  if (
    typeof price !== "number" ||
    !Number.isFinite(price) ||
    price <= 0
  ) {
    return res.status(400).json({
      error: "Please provide a valid market price"
    });
  }

  const prompt = `
你是一名谨慎的外汇与黄金市场分析助手。
请使用简体中文回答，不要声称能确定未来价格，也不要编造实时新闻或未提供的技术指标。

交易品种：${symbol}
最新获取价格：${price}
用户观察的趋势：${String(trend || "未提供")}
用户观察的市场结构：${String(structure || "未提供")}

请按以下格式分析：
1. 市场情况与已知信息
2. 多头情景及其成立条件
3. 空头情景及其成立条件
4. 需要等待的确认信号
5. 风险控制与无交易条件
6. 结论：偏多、偏空或观望，并说明理由

重要限制：
- 只有当前价格和用户选择的趋势、结构，不足以确认真正的技术趋势。
- 明确说明哪些信息尚未提供，例如K线、支撑阻力、成交量和经济新闻。
- 不要虚构精确入场价、止损价、止盈价或成功概率。
- 不要承诺收益，不要自动下单。
- 将分析标记为情景分析，而不是确定的交易信号。
`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 900
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return res.status(502).json({
        error:
          data.error?.message ||
          "Gemini request failed. Check API access and model availability."
      });
    }

    const analysis = data.candidates?.[0]?.content?.parts
      ?.map(part => part.text || "")
      .join("")
      .trim();

    if (!analysis) {
      return res.status(502).json({
        error: "Gemini returned no analysis"
      });
    }

    return res.status(200).json({
      symbol,
      price,
      source: "Gemini AI",
      analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Analysis request failed:", error);

    return res.status(502).json({
      error: "Unable to connect to Gemini AI"
    });
  }
}
