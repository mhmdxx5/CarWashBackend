require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const authRoutes = require("./Routes/authPhone");


const userRoutes = require("./Routes/userRoutes");
const supportRoutes = require("./Routes/supportRoutes");
const imageRoutes = require("./Routes/imageRoutes");
const bookingRoutes = require("./Routes/bookingRoutes");
const productRoutes = require("./Routes/productRoutes");
const chatRoutes = require("./Routes/chatRoutes");
const workingHoursRoutes = require('./Routes/workingHoursRoutes');
const workingHoursByDateRoutes = require('./Routes/workingHoursByDateRoutes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO logic
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`📥 User joined room: ${roomId}`);
  });

  socket.on("sendMessage", ({ roomId, message }) => {
    socket.to(roomId).emit("receiveMessage", message);
  });
  socket.on('typing', ({ roomId, isTyping }) => {
    socket.to(roomId).emit('typing', { isTyping });
  });
  socket.on("disconnect", () => {
    console.log("🔴 Client disconnected:", socket.id);
  });
});

// Middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use(express.json());
app.use(cors());
app.use("/api/users", userRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/products", productRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/chat", chatRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/working-hours', workingHoursRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/working-hours', workingHoursByDateRoutes); // 🔹 אותו prefix

// Database connection
console.log(process.env.MONGO_URI);
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ Error connecting to MongoDB:", err));

// Root
app.get("/", (req, res) => {
  res.send("🚀 Car Wash API is running...");
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server with Socket.IO is running on port ${PORT}`);
});
