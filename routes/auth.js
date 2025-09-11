const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { redirectIfAuthenticated } = require("../middleware/auth");

const router = express.Router();

// Login page
router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("auth/login", { title: "Login - Pharmacy Management System" });
});

// Login POST
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please enter a valid email address"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash("error_msg", errors.array()[0].msg);
        return res.redirect("/auth/login");
      }

      const { email, password } = req.body;

      // Find user by email (now includes password)
      const user = await User.findByEmail(email);
      console.log("user12", user);
      if (!user) {
        req.flash("error_msg", "Invalid12 email or password");
        return res.redirect("/auth/login");
      }

      // Verify password using password from user object
      const isValidPassword = await User.verifyPassword(
        password,
        user.password
      );
      console.log(password);
      console.log(isValidPassword);
      if (!isValidPassword) {
        req.flash("error_msg", "Invalid34 email or password");
        return res.redirect("/auth/login");
      }

      // Create session
      req.session.user = user.toJSON();
      req.session.userId = user.id;

      // Redirect based on role
      if (user.role === "admin") {
        req.flash("success_msg", "Welcome back, Admin!");
        res.redirect("/admin/dashboard");
      } else if (user.role === "pharmacist") {
        req.flash("success_msg", "Welcome back, " + user.full_name + "!");
        res.redirect("/pharmacist/dashboard");
      } else {
        req.flash("error_msg", "Invalid user role");
        res.redirect("/auth/login");
      }
    } catch (error) {
      console.error("Login error:", error);
      req.flash(
        "error_msg",
        "An error occurred during login. Please try again."
      );
      res.redirect("/auth/login");
    }
  }
);

// Logout
router.get("/logout", (req, res) => {
  const userName = req.session.user ? req.session.user.full_name : "User";

  // Set flash message before destroying session
  req.flash("success_msg", "You have been logged out successfully");

  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
      // Cannot use req.flash here because session is destroyed
      // Consider logging error or alternative handling
    }
    res.redirect("/auth/login");
  });
});

// Password recovery page
router.get("/forgot-password", redirectIfAuthenticated, (req, res) => {
  res.render("auth/forgot-password", {
    title: "Forgot Password - Pharmacy Management System",
  });
});

// Password recovery POST
router.post(
  "/forgot-password",
  [body("email").isEmail().withMessage("Please enter a valid email address")],
  async (req, res) => {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash("error_msg", errors.array()[0].msg);
        return res.redirect("/auth/forgot-password");
      }

      const { email } = req.body;

      // Check if user exists
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        req.flash(
          "success_msg",
          "If an account with that email exists, password recovery instructions have been sent."
        );
        return res.redirect("/auth/login");
      }

      // TODO: Implement actual email sending logic
      // For now, just show success message
      req.flash(
        "success_msg",
        "Password recovery instructions have been sent to your email address."
      );
      res.redirect("/auth/login");
    } catch (error) {
      console.error("Password recovery error:", error);
      req.flash("error_msg", "An error occurred. Please try again.");
      res.redirect("/auth/forgot-password");
    }
  }
);

// Change password page (for authenticated users)
router.get("/change-password", async (req, res) => {
  if (!req.session.user) {
    req.flash("error_msg", "Please log in to change your password");
    return res.redirect("/auth/login");
  }

  res.render("auth/change-password", {
    title: "Change Password - Pharmacy Management System",
    user: req.session.user,
  });
});

// Change password POST
router.post(
  "/change-password",
  [
    body("current_password")
      .notEmpty()
      .withMessage("Current password is required"),
    body("new_password")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters long"),
    body("confirm_password").custom((value, { req }) => {
      if (value !== req.body.new_password) {
        throw new Error("Password confirmation does not match");
      }
      return true;
    }),
  ],
  async (req, res) => {
    try {
      if (!req.session.user) {
        req.flash("error_msg", "Please log in to change your password");
        return res.redirect("/auth/login");
      }

      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash("error_msg", errors.array()[0].msg);
        return res.redirect("/auth/change-password");
      }

      const { current_password, new_password } = req.body;

      // Get current user with password
      const { getOne } = require("../config/database");
      const userWithPassword = await getOne(
        "SELECT password FROM users WHERE id = ?",
        [req.session.user.id]
      );

      if (!userWithPassword.success || !userWithPassword.data) {
        req.flash("error_msg", "User not found");
        return res.redirect("/auth/change-password");
      }

      // Verify current password
      const isValidPassword = await User.verifyPassword(
        current_password,
        userWithPassword.data.password
      );
      if (!isValidPassword) {
        req.flash("error_msg", "Current password is incorrect");
        return res.redirect("/auth/change-password");
      }

      // Update password
      const user = await User.findById(req.session.user.id);
      const updateResult = await user.update({ password: new_password });

      if (updateResult) {
        req.flash("success_msg", "Password changed successfully");

        // Redirect based on role
        if (req.session.user.role === "admin") {
          res.redirect("/admin/profile");
        } else {
          res.redirect("/pharmacist/profile");
        }
      } else {
        req.flash("error_msg", "Failed to change password. Please try again.");
        res.redirect("/auth/change-password");
      }
    } catch (error) {
      console.error("Change password error:", error);
      req.flash("error_msg", "An error occurred. Please try again.");
      res.redirect("/auth/change-password");
    }
  }
);

module.exports = router;
