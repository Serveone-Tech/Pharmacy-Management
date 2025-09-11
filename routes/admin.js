const express = require('express');
const { body, validationResult } = require('express-validator');
const { requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const Company = require('../models/Company');
const Medicine = require('../models/Medicine');
const Invoice = require('../models/Invoice');

const router = express.Router();

// Apply middleware to all admin routes
router.use(requireAdmin);

// Admin Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        // Get statistics
        const [
            pharmacistCount,
            companyCount,
            medicineCount,
            todaySales,
            yesterdaySales,
            last7DaysSales,
            totalInvoices,
            lowStockMedicines
        ] = await Promise.all([
            User.getStats().then(stats => stats.pharmacist),
            Company.getStats(),
            Medicine.getStats(),
            Invoice.getTodaySales(),
            Invoice.getYesterdaySales(),
            Invoice.getLast7DaysSales(),
            Invoice.getSalesStats(),
            Medicine.getLowStock()
        ]);

        res.render('admin/dashboard', { 
            title: 'Admin Dashboard - Pharmacy Management System',
            user: req.session.user,
            stats: {
                pharmacists: pharmacistCount,
                companies: companyCount,
                medicines: medicineCount,
                today_sales: todaySales.total_sales,
                yesterday_sales: yesterdaySales.total_sales,
                last7days_sales: last7DaysSales.total_sales,
                total_invoices: totalInvoices.total_invoices,
                low_stock_count: lowStockMedicines.length
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        req.flash('error_msg', 'Error loading dashboard data');
        res.render('admin/dashboard', { 
            title: 'Admin Dashboard - Pharmacy Management System',
            user: req.session.user,
            stats: {
                pharmacists: 0,
                companies: 0,
                medicines: 0,
                today_sales: 0,
                yesterday_sales: 0,
                last7days_sales: 0,
                total_invoices: 0,
                low_stock_count: 0
            }
        });
    }
});

// Companies routes
router.get('/companies', async (req, res) => {
    try {
        const companies = await Company.getWithMedicineCount();
        res.render('admin/companies', { 
            title: 'Manage Companies - Pharmacy Management System',
            user: req.session.user,
            companies
        });
    } catch (error) {
        console.error('Companies error:', error);
        req.flash('error_msg', 'Error loading companies');
        res.render('admin/companies', { 
            title: 'Manage Companies - Pharmacy Management System',
            user: req.session.user,
            companies: []
        });
    }
});

// Add company
router.post('/companies', [
    body('company_name').notEmpty().withMessage('Company name is required'),
    body('company_email').optional().isEmail().withMessage('Please enter a valid email'),
    body('company_phone').optional().isMobilePhone().withMessage('Please enter a valid phone number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array()[0].msg);
            return res.redirect('/admin/companies');
        }

        const company = await Company.create(req.body);
        if (company) {
            req.flash('success_msg', 'Company added successfully');
        } else {
            req.flash('error_msg', 'Failed to add company');
        }
        res.redirect('/admin/companies');
    } catch (error) {
        console.error('Add company error:', error);
        req.flash('error_msg', 'Error adding company');
        res.redirect('/admin/companies');
    }
});

// Update company
router.post('/companies/:id/update', [
    body('company_name').notEmpty().withMessage('Company name is required'),
    body('company_email').optional().isEmail().withMessage('Please enter a valid email'),
    body('company_phone').optional().isMobilePhone().withMessage('Please enter a valid phone number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array()[0].msg);
            return res.redirect('/admin/companies');
        }

        const company = await Company.findById(req.params.id);
        if (!company) {
            req.flash('error_msg', 'Company not found');
            return res.redirect('/admin/companies');
        }

        const updated = await company.update(req.body);
        if (updated) {
            req.flash('success_msg', 'Company updated successfully');
        } else {
            req.flash('error_msg', 'Failed to update company');
        }
        res.redirect('/admin/companies');
    } catch (error) {
        console.error('Update company error:', error);
        req.flash('error_msg', 'Error updating company');
        res.redirect('/admin/companies');
    }
});

// Delete company
router.post('/companies/:id/delete', async (req, res) => {
    try {
        const company = await Company.findById(req.params.id);
        if (!company) {
            req.flash('error_msg', 'Company not found');
            return res.redirect('/admin/companies');
        }

        const deleted = await company.deactivate();
        if (deleted) {
            req.flash('success_msg', 'Company deleted successfully');
        } else {
            req.flash('error_msg', 'Failed to delete company');
        }
        res.redirect('/admin/companies');
    } catch (error) {
        console.error('Delete company error:', error);
        req.flash('error_msg', 'Error deleting company');
        res.redirect('/admin/companies');
    }
});

// Medicines routes
router.get('/medicines', async (req, res) => {
    try {
        const [medicines, companies] = await Promise.all([
            Medicine.getAll(),
            Company.getAll()
        ]);
        
        res.render('admin/medicines', { 
            title: 'Manage Medicines - Pharmacy Management System',
            user: req.session.user,
            medicines,
            companies
        });
    } catch (error) {
        console.error('Medicines error:', error);
        req.flash('error_msg', 'Error loading medicines');
        res.render('admin/medicines', { 
            title: 'Manage Medicines - Pharmacy Management System',
            user: req.session.user,
            medicines: [],
            companies: []
        });
    }
});

// Add medicine
router.post('/medicines', [
    body('medicine_name').notEmpty().withMessage('Medicine name is required'),
    body('medicine_type').notEmpty().withMessage('Medicine type is required'),
    body('buying_price').isFloat({ min: 0 }).withMessage('Buying price must be a positive number'),
    body('selling_price').isFloat({ min: 0 }).withMessage('Selling price must be a positive number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array()[0].msg);
            return res.redirect('/admin/medicines');
        }

        const medicine = await Medicine.create(req.body);
        if (medicine) {
            req.flash('success_msg', 'Medicine added successfully');
        } else {
            req.flash('error_msg', 'Failed to add medicine');
        }
        res.redirect('/admin/medicines');
    } catch (error) {
        console.error('Add medicine error:', error);
        req.flash('error_msg', 'Error adding medicine');
        res.redirect('/admin/medicines');
    }
});

// Pharmacists routes
router.get('/pharmacists', async (req, res) => {
    try {
        const pharmacists = await User.getAllPharmacists();
        res.render('admin/pharmacists', { 
            title: 'Manage Pharmacists - Pharmacy Management System',
            user: req.session.user,
            pharmacists
        });
    } catch (error) {
        console.error('Pharmacists error:', error);
        req.flash('error_msg', 'Error loading pharmacists');
        res.render('admin/pharmacists', { 
            title: 'Manage Pharmacists - Pharmacy Management System',
            user: req.session.user,
            pharmacists: []
        });
    }
});

// Add pharmacist
router.post('/pharmacists', [
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('mobile').isMobilePhone().withMessage('Please enter a valid mobile number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array()[0].msg);
            return res.redirect('/admin/pharmacists');
        }

        const userData = {
            ...req.body,
            role: 'pharmacist'
        };

        const user = await User.create(userData);
        if (user) {
            req.flash('success_msg', 'Pharmacist added successfully');
        } else {
            req.flash('error_msg', 'Failed to add pharmacist');
        }
        res.redirect('/admin/pharmacists');
    } catch (error) {
        console.error('Add pharmacist error:', error);
        req.flash('error_msg', 'Error adding pharmacist');
        res.redirect('/admin/pharmacists');
    }
});

// Reports routes
router.get('/reports', async (req, res) => {
    try {
        const { date_from, date_to, pharmacist_id } = req.query;
        
        let salesData = [];
        let totalStats = { total_invoices: 0, total_sales: 0, average_sale: 0 };
        
        if (date_from && date_to) {
            salesData = await Invoice.getSalesByDateRange(date_from, date_to, pharmacist_id);
            totalStats = await Invoice.getSalesStats(pharmacist_id, date_from, date_to);
        }
        
        const pharmacists = await User.getAllPharmacists();
        
        res.render('admin/reports', { 
            title: 'Reports - Pharmacy Management System',
            user: req.session.user,
            salesData,
            totalStats,
            pharmacists,
            filters: { date_from, date_to, pharmacist_id }
        });
    } catch (error) {
        console.error('Reports error:', error);
        req.flash('error_msg', 'Error loading reports');
        res.render('admin/reports', { 
            title: 'Reports - Pharmacy Management System',
            user: req.session.user,
            salesData: [],
            totalStats: { total_invoices: 0, total_sales: 0, average_sale: 0 },
            pharmacists: [],
            filters: {}
        });
    }
});

// Invoice search routes
router.get('/invoices', async (req, res) => {
    try {
        const { search } = req.query;
        let invoices = [];
        
        if (search) {
            invoices = await Invoice.search(search);
        } else {
            invoices = await Invoice.getAll(20);
        }
        
        res.render('admin/invoices', { 
            title: 'Invoice Search - Pharmacy Management System',
            user: req.session.user,
            invoices,
            search: search || ''
        });
    } catch (error) {
        console.error('Invoices error:', error);
        req.flash('error_msg', 'Error loading invoices');
        res.render('admin/invoices', { 
            title: 'Invoice Search - Pharmacy Management System',
            user: req.session.user,
            invoices: [],
            search: ''
        });
    }
});

// View invoice details
router.get('/invoices/:id', async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            req.flash('error_msg', 'Invoice not found');
            return res.redirect('/admin/invoices');
        }
        
        res.render('admin/invoice-details', { 
            title: 'Invoice Details - Pharmacy Management System',
            user: req.session.user,
            invoice
        });
    } catch (error) {
        console.error('Invoice details error:', error);
        req.flash('error_msg', 'Error loading invoice details');
        res.redirect('/admin/invoices');
    }
});

// Inventory routes
router.get('/inventory', async (req, res) => {
    try {
        const [medicines, lowStockMedicines, expiredMedicines] = await Promise.all([
            Medicine.getAll(),
            Medicine.getLowStock(),
            Medicine.getExpired()
        ]);
        
        res.render('admin/inventory', { 
            title: 'Medicine Inventory - Pharmacy Management System',
            user: req.session.user,
            medicines,
            lowStockMedicines,
            expiredMedicines
        });
    } catch (error) {
        console.error('Inventory error:', error);
        req.flash('error_msg', 'Error loading inventory');
        res.render('admin/inventory', { 
            title: 'Medicine Inventory - Pharmacy Management System',
            user: req.session.user,
            medicines: [],
            lowStockMedicines: [],
            expiredMedicines: []
        });
    }
});

// Profile routes
router.get('/profile', (req, res) => {
    res.render('admin/profile', { 
        title: 'Admin Profile - Pharmacy Management System',
        user: req.session.user 
    });
});

// Update profile
router.post('/profile', [
    body('full_name').notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Please enter a valid email'),
    body('mobile').isMobilePhone().withMessage('Please enter a valid mobile number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error_msg', errors.array()[0].msg);
            return res.redirect('/admin/profile');
        }

        const user = await User.findById(req.session.user.id);
        if (!user) {
            req.flash('error_msg', 'User not found');
            return res.redirect('/admin/profile');
        }

        const updated = await user.update(req.body);
        if (updated) {
            // Update session data
            req.session.user = { ...req.session.user, ...req.body };
            req.flash('success_msg', 'Profile updated successfully');
        } else {
            req.flash('error_msg', 'Failed to update profile');
        }
        res.redirect('/admin/profile');
    } catch (error) {
        console.error('Update profile error:', error);
        req.flash('error_msg', 'Error updating profile');
        res.redirect('/admin/profile');
    }
});

module.exports = router;



// View medicine details
router.get("/medicines/:id", async (req, res) => {
    try {
        const medicine = await Medicine.findById(req.params.id);
        if (!medicine) {
            req.flash("error_msg", "Medicine not found");
            return res.redirect("/admin/medicines");
        }
        const companies = await Company.getAll();
        res.render("admin/medicine-details", {
            title: "Medicine Details - Pharmacy Management System",
            user: req.session.user,
            medicine,
            companies
        });
    } catch (error) {
        console.error("Medicine details error:", error);
        req.flash("error_msg", "Error loading medicine details");
        res.redirect("/admin/medicines");
    }
});




// Print invoice
router.get("/invoices/:id/print", async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            req.flash("error_msg", "Invoice not found");
            return res.redirect("/admin/invoices");
        }
        res.render("admin/invoice-print", {
            title: "Print Invoice - Pharmacy Management System",
            user: req.session.user,
            invoice
        });
    } catch (error) {
        console.error("Print invoice error:", error);
        req.flash("error_msg", "Error loading invoice for print");
        res.redirect("/admin/invoices");
    }
});




// View pharmacist details
router.get("/pharmacists/:id", async (req, res) => {
    try {
        const pharmacist = await User.findById(req.params.id);
        if (!pharmacist || pharmacist.role !== 'pharmacist') {
            req.flash("error_msg", "Pharmacist not found");
            return res.redirect("/admin/pharmacists");
        }
        res.render("admin/pharmacist-details", {
            title: "Pharmacist Details - Pharmacy Management System",
            user: req.session.user,
            pharmacist
        });
    } catch (error) {
        console.error("Pharmacist details error:", error);
        req.flash("error_msg", "Error loading pharmacist details");
        res.redirect("/admin/pharmacists");
    }
});

// Update pharmacist
router.post("/pharmacists/:id/update", [
    body("full_name").notEmpty().withMessage("Full name is required"),
    body("email").isEmail().withMessage("Please enter a valid email"),
    body("mobile").isMobilePhone().withMessage("Please enter a valid mobile number")
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash("error_msg", errors.array()[0].msg);
            return res.redirect("/admin/pharmacists");
        }

        const pharmacist = await User.findById(req.params.id);
        if (!pharmacist || pharmacist.role !== 'pharmacist') {
            req.flash("error_msg", "Pharmacist not found");
            return res.redirect("/admin/pharmacists");
        }

        const updated = await pharmacist.update(req.body);
        if (updated) {
            req.flash("success_msg", "Pharmacist updated successfully");
        } else {
            req.flash("error_msg", "Failed to update pharmacist");
        }
        res.redirect("/admin/pharmacists");
    } catch (error) {
        console.error("Update pharmacist error:", error);
        req.flash("error_msg", "Error updating pharmacist");
        res.redirect("/admin/pharmacists");
    }
});

// Deactivate pharmacist
router.post("/pharmacists/:id/deactivate", async (req, res) => {
    try {
        const pharmacist = await User.findById(req.params.id);
        if (!pharmacist || pharmacist.role !== 'pharmacist') {
            req.flash("error_msg", "Pharmacist not found");
            return res.redirect("/admin/pharmacists");
        }

        const deactivated = await pharmacist.deactivate();
        if (deactivated) {
            req.flash("success_msg", "Pharmacist deactivated successfully");
        } else {
            req.flash("error_msg", "Failed to deactivate pharmacist");
        }
        res.redirect("/admin/pharmacists");
    } catch (error) {
        console.error("Deactivate pharmacist error:", error);
        req.flash("error_msg", "Error deactivating pharmacist");
        res.redirect("/admin/pharmacists");
    }
});

// Activate pharmacist
router.post("/pharmacists/:id/activate", async (req, res) => {
    try {
        const pharmacist = await User.findById(req.params.id);
        if (!pharmacist || pharmacist.role !== 'pharmacist') {
            req.flash("error_msg", "Pharmacist not found");
            return res.redirect("/admin/pharmacists");
        }

        const activated = await pharmacist.activate();
        if (activated) {
            req.flash("success_msg", "Pharmacist activated successfully");
        } else {
            req.flash("error_msg", "Failed to activate pharmacist");
        }
        res.redirect("/admin/pharmacists");
    } catch (error) {
        console.error("Activate pharmacist error:", error);
        req.flash("error_msg", "Error activating pharmacist");
        res.redirect("/admin/pharmacists");
    }
});