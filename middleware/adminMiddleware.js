const adminMiddleware = (req, res, next) => {
    // التأكد إن المستخدم مسجل وله صلاحية "admin"
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      return res.status(403).json({ message: "⛔ ليس لديك صلاحية كمشرف" });
    }
  };
  
  module.exports = adminMiddleware;
  