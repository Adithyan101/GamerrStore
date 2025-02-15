const User = require("../../models/userSchema");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const pageerror = async (req, res) => {
  res.render("admin-error");
};

const loadLogin = async (req, res) => {
  if (req.session.admin) {
    return res.redirect("/admin/dashboard");
  } else {
    res.render("admin-login", { message: null });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin user
    const admin = await User.findOne({ email, isAdmin: true });
    if (admin) {
      // Check password
      const passwordMatch = await bcrypt.compare(password, admin.password);
      if (passwordMatch) {
        req.session.admin = true;
        req.session.adminId = admin._id;
        return res.redirect("/admin");
      } else {
        // Password mismatch
        return res.render("admin-login", {
          message: "Incorrect password. Please try again.",
        });
      }
    } else {
      // Admin not found
      return res.render("admin-login", {
        message: "Admin account not found.",
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return res.redirect("/pageerror");
  }
};

const logout = async (req, res) => {
  try {
    const user = req.session.user;

    req.session.destroy((err) => {
      if (err) {
        console.log("error destorying session", err);
        return res.redirect("pageerror");
      } else {
        res.clearCookie("connect.sid");
        res.redirect("/admin/login");
      }
    });
  } catch (error) {
    console.log("unexprected error during logout", error);
    res.redirect("/pagerror");
  }
};

module.exports = {
  loadLogin,
  login,
  pageerror,
  logout,
};
