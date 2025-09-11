const User = require('../models/User');

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    
    req.flash('error_msg', 'Please log in to access this page');
    res.redirect('/auth/login');
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    res.redirect('/auth/login');
};

// Middleware to check if user is pharmacist
const requirePharmacist = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'pharmacist') {
        return next();
    }
    
    req.flash('error_msg', 'Access denied. Pharmacist privileges required.');
    res.redirect('/auth/login');
};

// Middleware to redirect authenticated users away from login page
const redirectIfAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.user.role === 'admin') {
            return res.redirect('/admin/dashboard');
        } else if (req.session.user.role === 'pharmacist') {
            return res.redirect('/pharmacist/dashboard');
        }
    }
    next();
};

// Middleware to load user data into session if user ID exists
const loadUser = async (req, res, next) => {
    if (req.session && req.session.userId && !req.session.user) {
        try {
            const user = await User.findById(req.session.userId);
            if (user) {
                req.session.user = user.toJSON();
            } else {
                // User not found, clear session
                req.session.destroy();
            }
        } catch (error) {
            console.error('Error loading user:', error);
        }
    }
    next();
};

// Middleware to check role and redirect to appropriate dashboard
const checkRoleAndRedirect = (req, res, next) => {
    if (req.session && req.session.user) {
        const userRole = req.session.user.role;
        const currentPath = req.path;
        
        // If admin tries to access pharmacist routes
        if (userRole === 'admin' && currentPath.startsWith('/pharmacist')) {
            return res.redirect('/admin/dashboard');
        }
        
        // If pharmacist tries to access admin routes
        if (userRole === 'pharmacist' && currentPath.startsWith('/admin')) {
            return res.redirect('/pharmacist/dashboard');
        }
    }
    next();
};

// Middleware to set common template variables
const setTemplateVars = (req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.isAdmin = req.session.user && req.session.user.role === 'admin';
    res.locals.isPharmacist = req.session.user && req.session.user.role === 'pharmacist';
    res.locals.currentPath = req.path;
    next();
};

module.exports = {
    requireAuth,
    requireAdmin,
    requirePharmacist,
    redirectIfAuthenticated,
    loadUser,
    checkRoleAndRedirect,
    setTemplateVars
};

