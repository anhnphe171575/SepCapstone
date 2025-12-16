const Redis = require("ioredis");
const dotenv = require('dotenv');
dotenv.config();
const redis = new Redis({
    host: process.env.REDIS_HOST, // Địa chỉ Redis Server
    port: process.env.REDIS_PORT, // Cổng mặc định của Redis
    // password: "your_password", // Nếu Redis có đặt mật khẩu
});

redis.on("connect", () => {
    console.log("🟢 Connected to Redis");
});

redis.on("error", (err) => {
    console.error("❌ Redis error:", err);
});

module.exports = redis;
