const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const app = express();
app.set("trust proxy", 1);

/* -------------------- Middleware -------------------- */

// Parse cookies
app.use(cookieParser());

// ✅ Build allowed origins from ENV
const allowedOrigins = [
  process.env.USER_FRONTEND_URL,
  process.env.ADMIN_FRONTEND_URL
].filter(Boolean); // removes undefined values

// CORS configuration (COOKIE-SAFE)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, health checks)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


app.options("*", cors());


app.use(express.json());

/* -------------------- MongoDB -------------------- */

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

/* -------------------- Routes -------------------- */

app.use("/api/auth", require("./routes/auth"));
app.use("/api/user", require("./routes/user"));
app.use("/api/admin", require("./routes/admin"));

/* -------------------- Health Check -------------------- */

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

/* -------------------- Server -------------------- */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
