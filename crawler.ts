import puppeteer from "puppeteer";
import * as amqp from "amqplib";

async function crawl() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // 访问目标网站
  await page.goto("https://taobao.com");

  // 获取商品信息
  const products = await page.evaluate(() => {
    let results: { name: string; price: string; link: string }[] = [];
    let items = document.querySelectorAll(".product-item");
    items.forEach((item) => {
      const name = item.querySelector(".product-name")?.textContent;
      const price = item.querySelector(".product-price")?.textContent;
      const link = item.querySelector(".product-link")?.textContent;
      if (name && price && link)
        results.push({
          name,
          price,
          link,
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
