import express from "express";
import fetch from "node-fetch";

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
});

app.get("/stock", async (req, res) => {
  try {
    const { symbol } = req.query;
    const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&stockNo=${symbol}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "查詢失敗" });
  }
});
app.listen(3000, () => console.log("Server running on port 3000"));
