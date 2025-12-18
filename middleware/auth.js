const jwt = require("jsonwebtoken");

/* ================================
   User Authentication
================================ */
exports.authenticateUser = (req, res, next) => {
  const token = req.cookies?.userAccessToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (payload.isAdmin) {
      return res.status(403).json({ error: "Admins not allowed here" });
    }

    req.userId = payload.userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

/* ================================
   Admin Authentication
================================ */
exports.authenticateAdmin = (req, res, next) => {
  const token = req.cookies?.adminAccessToken;

  if (!token) {
    return res.status(401).json({ error: "Unauthenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!payload.isAdmin) {
      return res.status(403).json({ error: "Forbidden" });
    }

    req.isAdmin = true; // ✅ IMPORTANT (you fixed it)
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};
