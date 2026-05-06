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

// 取得某月的日K資料
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

// 判斷某日期是否為週五（民國日期格式 "115/05/02"）
function isFriday(rocDate) {
  const parts = rocDate.split("/");
  const y = parseInt(parts[0]) + 1911;
  const m = parseInt(parts[1]) - 1;
  const d = parseInt(parts[2]);
  return new Date(y, m, d).getDay() === 5;
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

app.get("/fridays", async (req, res) => {
  try {
    const { symbol } = req.query;
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    let rows = await fetchMonthData(symbol, year, month);

    // 如果本月資料不足，補抓上個月
    if (rows.length < 10) {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      const prevRows = await fetchMonthData(symbol, prevYear, prevMonth);
      rows = [...prevRows, ...rows];
    }

    // 篩出所有週五
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
