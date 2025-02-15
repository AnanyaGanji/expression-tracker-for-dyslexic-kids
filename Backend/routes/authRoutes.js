const express = require("express");
const {
  register,
  login,
  updateAdminStatus,
  updatePassword,
  getAllStatus,
  getObjectID,
} = require("../controllers/authController");
const authenticateToken = require("../middlewares/authMiddleware");
const authorizeRoles = require("../middlewares/roleMiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/adminlogin", login);
// Route to handle updating status
router.patch("/updateAdminStatus/:id", updateAdminStatus);
// Update admin password
router.put("/updatePassword/:id", updatePassword);
router.get("/getAllStatus", getAllStatus);
router.get("/getObjectID/:admin_email", getObjectID);
module.exports = router;
