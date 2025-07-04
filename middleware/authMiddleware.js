const jwt = require("jsonwebtoken");
const User = require("../Models/User");

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "غير مصرح" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user || user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ message: "تم تسجيل خروجك. الرجاء تسجيل الدخول مجددًا." });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "رمز التحقق غير صالح" });
  }
};

module.exports = authMiddleware;
