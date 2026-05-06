import express from "express";
import fetch from "node-fetch";

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/stock", async (req, res) => {
  try {
    const { symbol } = req.query;
    const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&stockNo=${symbol}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "查詢失敗" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
