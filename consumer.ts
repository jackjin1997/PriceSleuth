import * as amqp from "amqplib";
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";

const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);
const dbName = "price_tracker";
let db;

async function initDb() {
  await client.connect();
  db = client.db(dbName);
}

async function checkPriceDrop(product) {
  const collection = db.collection("products");
  const existingProduct = await collection.findOne({ name: product.name });

  if (existingProduct) {
    const oldPrice = parseFloat(existingProduct.price.replace("$", ""));
    const newPrice = parseFloat(product.price.replace("$", ""));
    if (newPrice < oldPrice) {
      // 价格下降，发送通知
      await sendNotification(product);
    }
  }

  await collection.updateOne(
    { name: product.name },
    { $set: product },
    { upsert: true }
  );
}

async function sendNotification(product) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "your-email@gmail.com",
      pass: "your-email-password",
    },
  });

  const mailOptions = {
    from: "your-email@gmail.com",
    to: "user-email@example.com",
    subject: `Price Drop Alert: ${product.name}`,
    text: `The price for ${product.name} has dropped to ${product.price}. Check it out here: ${product.link}`,
  };

  await transporter.sendMail(mailOptions);
}

async function consume() {
  await initDb();

  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  const queue = "product_queue";

  await channel.assertQueue(queue, { durable: false });

  channel.consume(
    queue,
    async (msg) => {
      if (msg !== null) {
        const product = JSON.parse(msg.content.toString());
        await checkPriceDrop(product);
        channel.ack(msg);
      }
    },
    { noAck: false }
  );
}

consume();
