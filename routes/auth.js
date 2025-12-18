const express = require("express");
const router = express.Router();
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/* ================================
   Google OAuth Login
================================ */
router.post("/google", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Verify Google token (with timeout safety)
    let ticket;
    try {
      ticket = await Promise.race([
        client.verifyIdToken({
          idToken: token,
          audience: process.env.GOOGLE_CLIENT_ID
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Google verification timeout")), 10000)
        )
      ]);
    } catch (err) {
      console.error("Google token verification error:", err.message);
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email;
    const name = payload.name;

    // Find or create user
    let user = await User.findOne({ googleId });

    if (!user) {
      user = new User({
        googleId,
        email,
        name,
        status: "NONE"
      });
      await user.save();
    }

    // Generate JWT (USER)
    const jwtToken = jwt.sign(
      {
        userId: user._id,
        isAdmin: false
      },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ SET HttpOnly COOKIE (PRODUCTION SAFE)
    res.cookie("userAccessToken", jwtToken, {
      httpOnly: true,
      secure: true,       // REQUIRED on Render / HTTPS
      sameSite: "none",   // REQUIRED for cross-origin cookies
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    // ✅ Return ONLY user data (NO TOKEN)
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        passwordSet: user.passwordSet,
        codechefUsername: user.codechefUsername,
        verificationHex: user.verificationHex,
        submissionId: user.submissionId
      }
    });

  } catch (error) {
    console.error("Google auth error:", error);
    res.status(401).json({ error: "Invalid Google token" });
  }
});

/* ================================
   User Logout (FIXED)
================================ */
router.post("/logout", (req, res) => {
  // ✅ MUST match cookie attributes exactly
  res.clearCookie("userAccessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });

  res.clearCookie("adminAccessToken", {
    httpOnly: true,
    secure: true,
    sameSite: "none"
  });

  res.json({ message: "Logged out successfully" });
});

module.exports = router;
