const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { authenticateAdmin } = require("../middleware/auth");

/* ================================
   Rate limiter (ONLY for login)
================================ */
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false
});

/* ================================
   Admin Login
================================ */
router.post("/login", adminLoginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      username !== process.env.ADMIN_USERNAME ||
      password !== process.env.ADMIN_PASSWORD
    ) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        isAdmin: true
        
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "24h" }
    );

    // ✅ HttpOnly cookie (REQUIRED)
    res.cookie("adminAccessToken", token, {
  httpOnly: true,
  secure: true,
sameSite: "none",
  maxAge: 24 * 60 * 60 * 1000
});


    res.json({ message: "Admin login successful" });

  } catch (err) {
    console.error("Admin login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   Logout
================================ */
router.post("/logout", authenticateAdmin, (req, res) => {
  res.clearCookie("adminAccessToken");
  res.json({ message: "Logged out successfully" });
});

/* ================================
   Get verification requests
================================ */
router.get("/verification-requests", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({
      status: { $in: ["PENDING", "REJECTED"] }
    })
      .select("-password")
      .sort({ updatedAt: -1 });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   Get verified users
================================ */
router.get("/verified-users", authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({ status: "VERIFIED" })
      .select("-password")
      .sort({ updatedAt: -1 });

    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   Verify user
================================ */
router.post("/verify/:userId", authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status !== "PENDING") {
      return res.status(400).json({ error: "User not in pending state" });
    }

    const existing = await User.findOne({
      codechefUsername: user.codechefUsername,
      status: "VERIFIED",
      _id: { $ne: user._id }
    });

    if (existing) {
      return res.status(400).json({
        error: "CodeChef username already verified"
      });
    }

    user.status = "VERIFIED";
    user.updatedAt = new Date();
    await user.save();

    res.json({ message: "User verified successfully" });

  } catch (err) {
    console.error("Verify error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   Reject user
================================ */
router.post("/reject/:userId", authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status !== "PENDING") {
      return res.status(400).json({ error: "User not in pending state" });
    }

    user.status = "REJECTED";
    user.updatedAt = new Date();
    await user.save();

    res.json({ message: "User rejected" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   Get all users (filters)
================================ */
router.get("/all-users", authenticateAdmin, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status) query.status = status;

    if (search) {
      query.$or = [
        { email: new RegExp(search, "i") },
        { codechefUsername: new RegExp(search, "i") },
        { name: new RegExp(search, "i") }
      ];
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({ users, count: users.length });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   Stats
================================ */
router.get("/stats", authenticateAdmin, async (req, res) => {
  try {
    res.json({
      totalUsers: await User.countDocuments(),
      verifiedUsers: await User.countDocuments({ status: "VERIFIED" }),
      pendingUsers: await User.countDocuments({ status: "PENDING" }),
      rejectedUsers: await User.countDocuments({ status: "REJECTED" }),
      noneUsers: await User.countDocuments({ status: "NONE" }),
      passwordSetUsers: await User.countDocuments({ passwordSet: true })
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   Revoke verification
================================ */
router.post("/revoke/:userId", authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status !== "VERIFIED") {
      return res.status(400).json({ error: "User not verified" });
    }

    user.status = "REJECTED";
    user.verificationHex = null;
    user.submissionId = null;
    user.updatedAt = new Date();
    await user.save();

    res.json({ message: "Verification revoked" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   Delete user (non-verified only)
================================ */
router.delete("/delete/:userId", authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.status === "VERIFIED") {
      return res.status(400).json({
        error: "Cannot delete verified user"
      });
    }

    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: "User deleted" });

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
