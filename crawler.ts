const puppeteer = require("puppeteer");
const amqp = require("amqplib");

async function crawl() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // 访问目标网站
  await page.goto("https://example-ecommerce-site.com");

  // 获取商品信息
  const products = await page.evaluate(() => {
    let results = [];
    let items = document.querySelectorAll(".product-item");
    items.forEach((item) => {
      results.push({
        name: item.querySelector(".product-name").innerText,
        price: item.querySelector(".product-price").innerText,
        link: item.querySelector(".product-link").href,
      });
    });
    return results;
  });

  await browser.close();

  // 发送到消息队列
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  const queue = "product_queue";

  await channel.assertQueue(queue, { durable: false });
  products.forEach((product) => {
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(product)));
  });

  setTimeout(() => {
    connection.close();
    process.exit(0);
  }, 500);
}

crawl();
