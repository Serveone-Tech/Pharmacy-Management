const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const expressLayouts = require("express-ejs-layouts");
const flash = require("connect-flash");
require("dotenv").config();

const { testConnection } = require("./config/database");
const {
  loadUser,
  setTemplateVars,
  checkRoleAndRedirect,
} = require("./middleware/auth");

// Routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const pharmacistRoutes = require("./routes/pharmacist");

const app = express();
const PORT = process.env.PORT || 3000;

/* ===================== BASIC MIDDLEWARE ===================== */

// CORS
app.use(cors({ origin: "*", credentials: true }));

// Body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "pharmacy_management_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // production + https => true
      maxAge: 24 * 60 * 60 * 1000,
    },
  }),
);

// Flash
app.use(flash());

/* ===================== VIEW ENGINE ===================== */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Layout engine
app.use(expressLayouts);
app.set("layout", false); // hum route me layout define karenge

/* ===================== STATIC FILES ===================== */

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ===================== AUTH / TEMPLATE MIDDLEWARE ===================== */

app.use(loadUser);
app.use(setTemplateVars);
app.use(checkRoleAndRedirect);

// Global variables (available in all EJS files)
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

/* ===================== ROUTES ===================== */

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/pharmacist", pharmacistRoutes);

/**
 * ROOT ROUTE
 * sirf role ke basis pe redirect karega
 * render yahan kabhi nahi hoga
 */
app.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  if (req.session.user.role === "admin") {
    return res.redirect("/admin/dashboard");
  }

  if (req.session.user.role === "pharmacist") {
    return res.redirect("/pharmacist/dashboard");
  }

  return res.redirect("/auth/login");
});

/* ===================== ERROR HANDLING ===================== */

// 404
app.use((req, res) => {
  res.status(404).render("error", {
    title: "Page Not Found",
    message: "The page you are looking for does not exist.",
  });
});

// 500
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("error", {
    title: "Server Error",
    message: "Something went wrong on our end.",
  });
});

/* ===================== SERVER ===================== */

const startServer = async () => {
  try {
    await testConnection();

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Server start failed:", err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
