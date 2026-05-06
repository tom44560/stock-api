｛
  export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const { symbol } = req.query;
  const url = `https://www.twse.com.tw/exchangeReport/STOCK_DAY?response=json&stockNo=${symbol}`;
  const response = await fetch(url);
  const data = await response.json();
  res.json(data);
}
