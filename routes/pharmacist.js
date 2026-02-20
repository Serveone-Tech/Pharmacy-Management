const express = require("express");
const { body, validationResult } = require("express-validator");
const { requirePharmacist } = require("../middleware/auth");
const User = require("../models/User");
const Medicine = require("../models/Medicine");
const Invoice = require("../models/Invoice");

const router = express.Router();

// Apply middleware to all pharmacist routes
router.use(requirePharmacist);

// Pharmacist Dashboard
router.get("/dashboard", async (req, res) => {
  try {
    const pharmacistId = req.session.user.id;

    // Get sales statistics for this pharmacist
    const [
      todaySales,
      yesterdaySales,
      last7DaysSales,
      totalSales,
      lowStockMedicines,
    ] = await Promise.all([
      Invoice.getTodaySales(pharmacistId),
      Invoice.getYesterdaySales(pharmacistId),
      Invoice.getLast7DaysSales(pharmacistId),
      Invoice.getSalesStats(pharmacistId),
      Medicine.getLowStock(),
    ]);

    res.render("pharmacist/dashboard", {
      title: "Pharmacist Dashboard - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
      stats: {
        today_sales: todaySales.total_sales,
        today_invoices: todaySales.total_invoices,
        yesterday_sales: yesterdaySales.total_sales,
        last7days_sales: last7DaysSales.total_sales,
        total_sales: totalSales.total_sales,
        total_invoices: totalSales.total_invoices,
        low_stock_count: lowStockMedicines.length,
      },
    });
  } catch (error) {
    console.error("Pharmacist dashboard error:", error);
    req.flash("error_msg", "Error loading dashboard data");
    res.render("pharmacist/dashboard", {
      title: "Pharmacist Dashboard - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
      stats: {
        today_sales: 0,
        today_invoices: 0,
        yesterday_sales: 0,
        last7days_sales: 0,
        total_sales: 0,
        total_invoices: 0,
        low_stock_count: 0,
      },
    });
  }
});

// Inventory routes
router.get("/inventory", async (req, res) => {
  try {
    const [medicines, lowStockMedicines] = await Promise.all([
      Medicine.getAll(),
      Medicine.getLowStock(),
    ]);

    res.render("pharmacist/inventory", {
      title: "Medicine Inventory - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
      medicines,
      lowStockMedicines,
    });
  } catch (error) {
    console.error("Inventory error:", error);
    req.flash("error_msg", "Error loading inventory");
    res.render("pharmacist/inventory", {
      title: "Medicine Inventory - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
      medicines: [],
      lowStockMedicines: [],
    });
  }
});

// Search medicines API
router.get("/api/medicines/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const medicines = await Medicine.search(q);
    res.json(medicines);
  } catch (error) {
    console.error("Medicine search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// Sales/POS routes
router.get("/sales", async (req, res) => {
  try {
    res.render("pharmacist/sales", {
      title: "Point of Sale - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
    });
  } catch (error) {
    console.error("Sales page error:", error);
    req.flash("error_msg", "Error loading sales page");
    res.redirect("/pharmacist/dashboard");
  }
});

// Create invoice
router.post(
  "/sales/invoice",
  [
    body("items")
      .isArray({ min: 1 })
      .withMessage("At least one item is required"),
    body("total_amount")
      .isFloat({ min: 0 })
      .withMessage("Total amount must be a positive number"),
    body("final_amount")
      .isFloat({ min: 0 })
      .withMessage("Final amount must be a positive number"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: errors.array()[0].msg,
        });
      }

      const invoiceData = {
        ...req.body,
        pharmacist_id: req.session.user.id,
      };

      const invoice = await Invoice.create(invoiceData, req.body.items);
      if (invoice) {
        res.json({
          success: true,
          message: "Invoice created successfully",
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create invoice",
        });
      }
    } catch (error) {
      console.error("Create invoice error:", error);
      res.status(500).json({
        success: false,
        message: "Error creating invoice",
      });
    }
  },
);

// Invoice search routes
router.get("/invoices", async (req, res) => {
  try {
    const { search } = req.query;
    const pharmacistId = req.session.user.id;

    let invoices = [];

    if (search) {
      // Search all invoices if admin, or only pharmacist's invoices
      invoices = await Invoice.search(search);
      // Filter by pharmacist if not admin
      if (req.session.user.role !== "admin") {
        invoices = invoices.filter((inv) => inv.pharmacist_id === pharmacistId);
      }
    } else {
      // Get recent invoices for this pharmacist
      const allInvoices = await Invoice.getAll(20);
      invoices = allInvoices.filter(
        (inv) => inv.pharmacist_id === pharmacistId,
      );
    }

    res.render("pharmacist/invoices", {
      title: "Invoice Search - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
      invoices,
      search: search || "",
    });
  } catch (error) {
    console.error("Invoices error:", error);
    req.flash("error_msg", "Error loading invoices");
    res.render("pharmacist/invoices", {
      title: "Invoice Search - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
      invoices: [],
      search: "",
    });
  }
});

// View invoice details
router.get("/invoices/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      req.flash("error_msg", "Invoice not found");
      return res.redirect("/pharmacist/invoices");
    }

    // Check if pharmacist can view this invoice
    if (
      req.session.user.role !== "admin" &&
      invoice.pharmacist_id !== req.session.user.id
    ) {
      req.flash("error_msg", "Access denied");
      return res.redirect("/pharmacist/invoices");
    }

    // Calculate sub_total, discount_percentage, grand_total for the view
    const sub_total = invoice.total_amount || 0;
    const discount_amount = invoice.discount_amount || 0;
    const grand_total = invoice.final_amount || 0;
    const discount_percentage =
      sub_total > 0 ? ((discount_amount / sub_total) * 100).toFixed(2) : 0;

    res.render("pharmacist/invoice-details", {
      title: "Invoice Details - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
      invoice: {
        ...invoice,
        sub_total,
        discount_amount,
        grand_total,
        discount_percentage,
      },
    });
  } catch (error) {
    console.error("Invoice details error:", error);
    req.flash("error_msg", "Error loading invoice details");
    res.redirect("/pharmacist/invoices");
  }
});

// Sales reports routes
router.get("/reports", async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const pharmacistId = req.session.user.id;

    let salesData = [];
    let totalStats = { total_invoices: 0, total_sales: 0, average_sale: 0 };

    if (date_from && date_to) {
      salesData = await Invoice.getSalesByDateRange(
        date_from,
        date_to,
        pharmacistId,
      );
      totalStats = await Invoice.getSalesStats(
        pharmacistId,
        date_from,
        date_to,
      );
    }

    res.render("pharmacist/reports", {
      title: "Sales Reports - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
      salesData,
      totalStats,
      filters: { date_from, date_to },
    });
  } catch (error) {
    console.error("Reports error:", error);
    req.flash("error_msg", "Error loading reports");
    res.render("pharmacist/reports", {
      title: "Sales Reports - Pharmacy Management System",
      layout: "layouts/pharmacist-layout",
      user: req.session.user,
      salesData: [],
      totalStats: { total_invoices: 0, total_sales: 0, average_sale: 0 },
      filters: {},
    });
  }
});

// Profile routes
router.get("/profile", (req, res) => {
  res.render("pharmacist/profile", {
    title: "Pharmacist Profile - Pharmacy Management System",
    layout: "layouts/pharmacist-layout",
    user: req.session.user,
  });
});

// Update profile
router.post(
  "/profile",
  [
    body("full_name").notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("mobile")
      .isMobilePhone()
      .withMessage("Please enter a valid mobile number"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        req.flash("error_msg", errors.array()[0].msg);
        return res.redirect("/pharmacist/profile");
      }

      const user = await User.findById(req.session.user.id);
      if (!user) {
        req.flash("error_msg", "User not found");
        return res.redirect("/pharmacist/profile");
      }

      const updated = await user.update(req.body);
      if (updated) {
        // Update session data
        req.session.user = { ...req.session.user, ...req.body };
        req.flash("success_msg", "Profile updated successfully");
      } else {
        req.flash("error_msg", "Failed to update profile");
      }
      res.redirect("/pharmacist/profile");
    } catch (error) {
      console.error("Update profile error:", error);
      req.flash("error_msg", "Error updating profile");
      res.redirect("/pharmacist/profile");
    }
  },
);

module.exports = router;
