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

async function fetchMonthData(symbol, year, month) {
  const ym = `${year}${String(month).padStart(2,"0")}01`;
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&date=${ym}&stockNo=${symbol}`;
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  const data = await res.json();
  if (data.stat !== "OK") return [];
  return data.data.map(row => ({
    date: row[0],
    close: parseFloat(row[6].replace(/,/g, "")),
  }));
}

function isFriday(rocDate) {
  const parts = rocDate.split("/");
  const y = parseInt(parts[0]) + 1911;
  const m = parseInt(parts[1]) - 1;
  const d = parseInt(parts[2]);
  return new Date(y, m, d).getDay() === 5;
}

async function getRecentRows(symbol, minCount) {
  const now = new Date();
  let rows = [];
  for (let i = 0; i < 3 && rows.length < minCount; i++) {
    let d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const r = await fetchMonthData(symbol, d.getFullYear(), d.getMonth() + 1);
    rows = [...r, ...rows];
  }
  return rows;
}

app.get("/stock", async (req, res) => {
  try {
    const { symbol } = req.query;
    const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&stockNo=${symbol}`;
    const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "查詢失敗" });
  }
});

app.get("/quote", async (req, res) => {
  try {
    const { symbol } = req.query;
    const rows = await getRecentRows(symbol, 20);
    if (!rows.length) return res.status(404).json({ error: "查無資料" });

    const closes = rows.map(r => r.close);
    const latest = rows[rows.length - 1];

    const ma = (n) => {
      const slice = closes.slice(-n);
      if (slice.length < n) return null;
      return Math.round(slice.reduce((a,b)=>a+b,0) / n * 100) / 100;
    };

    const fridays = rows.filter(r => isFriday(r.date));
    const thisWeekFriday = fridays[fridays.length - 1] || null;
    const lastWeekFriday = fridays[fridays.length - 2] || null;

    const titleRes = await fetch(
      `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&stockNo=${symbol}`,
      { headers: { "User-Agent": "Mozilla/5.0" } }
    );
    const titleData = await titleRes.json();
    const title = titleData.title || "";
    const titleParts = title.split(" ").map(s=>s.trim()).filter(Boolean);
    const nameIdx = titleParts.findIndex(p=>p===symbol);
    const name = nameIdx>=0&&titleParts[nameIdx+1] ? titleParts[nameIdx+1] : symbol;

    res.json({
      symbol, name,
      close: latest.close,
      date: latest.date,
      ma5: ma(5),
      ma10: ma(10),
      ma20: ma(20),
      thisWeekFriday,
      lastWeekFriday,
    });
  } catch (e) {
    res.status(500).json({ error: "查詢失敗: " + e.message });
  }
});

app.get("/fridays", async (req, res) => {
  try {
    const { symbol } = req.query;
    const rows = await getRecentRows(symbol, 10);
    const fridays = rows.filter(r => isFriday(r.date));
    const thisWeekFriday = fridays[fridays.length - 1] || null;
    const lastWeekFriday = fridays[fridays.length - 2] || null;
    res.json({ thisWeekFriday, lastWeekFriday, allFridays: fridays });
  } catch (e) {
    res.status(500).json({ error: "查詢失敗" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
