const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bodyParser = require("body-parser");
const { connectDB } = require("./config/db");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const { setupSocket } = require('./config/socket.io');
const userRoutes = require('./routes/user.route');
const authRoutes = require('./routes/auth.route');
const projectRoutes = require('./routes/project.route');
const featureRoutes = require('./routes/feature.route');
const teamRoutes = require('./routes/team.route');
const taskRoutes = require('./routes/task.route');
const functionRoutes = require('./routes/function.route');
const documentRoutes = require('./routes/document.route');
const folderRoutes = require('./routes/folder.route');
const meetingRoutes = require('./routes/meeting.route');
const notificationRoutes = require('./routes/notification.route');
const messageRoutes = require('./routes/message.route');
const taskDeadlineRoutes = require('./routes/taskDeadline.route');
const { setupCronJobs } = require('./config/cronJobs');

const app = express();
const server = http.createServer(app);
// Initialize Socket.IO
setupSocket(server);


// Swagger UI setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "WDP API Documentation"
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL || process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  allowedHeaders: "Content-Type,Authorization"
}));

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} in ${duration}ms`);
    });
    next();
  });
// Routes
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', featureRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/meetings', meetingRoutes);

app.use('/api', taskRoutes);
app.use('/api', functionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/tasks', taskDeadlineRoutes);


const PORT = 5000;
(async () => {
  try {
    await connectDB();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
      // Khởi tạo cron jobs sau khi server đã start
      setupCronJobs();
    });
  } catch (error) {
    console.error('Failed to start server due to DB connection error');
    process.exit(1);
  }
})();