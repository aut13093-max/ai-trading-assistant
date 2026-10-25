
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const allowedSymbols = [
    "EUR/USD",
    "GBP/USD",
    "USD/JPY",
    "XAU/USD"
  ];

  const symbol = String(
    req.query.symbol || "EUR/USD"
  ).toUpperCase();

  if (!allowedSymbols.includes(symbol)) {
    return res.status(400).json({
      error: "Unsupported symbol"
    });
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Market data API key is not configured"
    });
  }

  try {
    const url = new URL(
      "https://api.twelvedata.com/price"
    );

    url.searchParams.set("symbol", symbol);
    url.searchParams.set("apikey", apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (
      !response.ok ||
      data.status === "error" ||
      data.price === undefined ||
      !Number.isFinite(Number(data.price))
    ) {
      return res.status(502).json({
        error: data.message || "Unable to retrieve market price"
      });
    }

    return res.status(200).json({
      symbol,
      price: Number(data.price),
      source: "Twelve Data",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Market API error:", error);

    return res.status(502).json({
      error: "Market data request failed"
    });
  }
}
