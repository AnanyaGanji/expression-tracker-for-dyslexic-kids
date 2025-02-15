const express = require("express");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const router = express.Router();

//Only admin can access this router
router.get("/admin", authenticateToken, authorizeRoles("admin"), (req, res) => {
  res.json({ message: "Welcome Admin" });
});
//Both admin and child can access this router
router.get(
  "/child",
  authenticateToken,
  authorizeRoles("admin", "child"),
  (req, res) => {
    res.json({ message: "Welcome Child" });
  }
);
//All can access this router
router.get("/user", authenticateToken, (req, res) => {
  res.json({ message: "Welcome User" });
});

module.exports = router;
