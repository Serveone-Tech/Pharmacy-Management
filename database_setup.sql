-- Pharmacy Management System Database Setup
-- Run this script to create the database and tables

-- Create database
CREATE DATABASE IF NOT EXISTS pharmacy_management;
USE pharmacy_management;

-- 1. Users Table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'pharmacist') NOT NULL,
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 2. Companies Table
CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(100) NOT NULL,
    company_email VARCHAR(100),
    company_phone VARCHAR(15),
    company_address TEXT,
    contact_person VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Medicines Table
CREATE TABLE medicines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    medicine_name VARCHAR(100) NOT NULL,
    generic_name VARCHAR(100),
    company_id INT,
    medicine_type ENUM('tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'other') NOT NULL,
    buying_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    quantity_in_stock INT DEFAULT 0,
    min_stock_level INT DEFAULT 10,
    expiry_date DATE,
    batch_number VARCHAR(50),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
);

-- 4. Invoices Table
CREATE TABLE invoices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100),
    customer_mobile VARCHAR(15),
    customer_address TEXT,
    pharmacist_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('cash', 'card', 'upi', 'other') DEFAULT 'cash',
    invoice_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pharmacist_id) REFERENCES users(id) ON DELETE RESTRICT
);

-- 5. Invoice Items Table
CREATE TABLE invoice_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    medicine_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT
);

-- 6. Stock Movements Table
CREATE TABLE stock_movements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    medicine_id INT NOT NULL,
    movement_type ENUM('in', 'out', 'adjustment') NOT NULL,
    quantity INT NOT NULL,
    reference_type ENUM('purchase', 'sale', 'adjustment', 'return') NOT NULL,
    reference_id INT,
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- 7. Password Reset Tokens Table
CREATE TABLE password_reset_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create Indexes for Performance
CREATE INDEX idx_medicines_company ON medicines(company_id);
CREATE INDEX idx_medicines_name ON medicines(medicine_name);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_pharmacist ON invoices(pharmacist_id);
CREATE INDEX idx_invoices_mobile ON invoices(customer_mobile);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_medicine ON invoice_items(medicine_id);
CREATE INDEX idx_stock_movements_medicine ON stock_movements(medicine_id);

-- Insert Default Admin User (password: admin123)
INSERT INTO users (full_name, email, mobile, password, role, address) VALUES
('System Administrator', 'admin@pharmacy.com', '9999999999', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System Address');

-- Insert Sample Companies
INSERT INTO companies (company_name, company_email, company_phone, company_address, contact_person) VALUES
('ABC Pharmaceuticals Ltd.', 'contact@abcpharma.com', '9876543210', '123 Medical Street, Healthcare City', 'John Smith'),
('XYZ Medical Corporation', 'info@xyzmedical.com', '9876543211', '456 Pharma Avenue, Medicine Town', 'Jane Doe'),
('HealthCare Industries', 'support@healthcare.com', '9876543212', '789 Wellness Road, Health City', 'Mike Johnson');

-- Insert Sample Medicines
INSERT INTO medicines (medicine_name, generic_name, company_id, medicine_type, buying_price, selling_price, quantity_in_stock, min_stock_level, expiry_date, batch_number, description) VALUES
('Paracetamol 500mg', 'Acetaminophen', 1, 'tablet', 2.50, 3.00, 100, 20, '2025-12-31', 'PAR001', 'Pain reliever and fever reducer'),
('Amoxicillin 250mg', 'Amoxicillin', 2, 'capsule', 5.00, 6.50, 50, 15, '2025-10-15', 'AMX001', 'Antibiotic for bacterial infections'),
('Cough Syrup 100ml', 'Dextromethorphan', 3, 'syrup', 45.00, 55.00, 30, 10, '2025-08-20', 'CS001', 'Cough suppressant syrup'),
('Vitamin C 500mg', 'Ascorbic Acid', 1, 'tablet', 1.50, 2.00, 200, 50, '2026-06-30', 'VTC001', 'Vitamin C supplement'),
('Ibuprofen 400mg', 'Ibuprofen', 2, 'tablet', 3.00, 4.00, 75, 25, '2025-11-25', 'IBU001', 'Anti-inflammatory pain reliever');

-- Insert Sample Pharmacist User (password: pharmacist123)
INSERT INTO users (full_name, email, mobile, password, role, address) VALUES
('John Pharmacist', 'pharmacist@pharmacy.com', '8888888888', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'pharmacist', 'Pharmacist Address');

-- Sample Invoice
INSERT INTO invoices (invoice_number, customer_name, customer_mobile, pharmacist_id, total_amount, discount_amount, final_amount, payment_method, invoice_date) VALUES
('INV-2024-001', 'Customer One', '7777777777', 2, 15.50, 1.50, 14.00, 'cash', CURDATE());

-- Sample Invoice Items
INSERT INTO invoice_items (invoice_id, medicine_id, quantity, unit_price, total_price) VALUES
(1, 1, 3, 3.00, 9.00),
(1, 4, 2, 2.00, 4.00),
(1, 5, 1, 4.00, 4.00);

-- Update stock after sale
UPDATE medicines SET quantity_in_stock = quantity_in_stock - 3 WHERE id = 1;
UPDATE medicines SET quantity_in_stock = quantity_in_stock - 2 WHERE id = 4;
UPDATE medicines SET quantity_in_stock = quantity_in_stock - 1 WHERE id = 5;

-- Insert stock movements for the sale
INSERT INTO stock_movements (medicine_id, movement_type, quantity, reference_type, reference_id, notes, created_by) VALUES
(1, 'out', 3, 'sale', 1, 'Sale via invoice INV-2024-001', 2),
(4, 'out', 2, 'sale', 1, 'Sale via invoice INV-2024-001', 2),
(5, 'out', 1, 'sale', 1, 'Sale via invoice INV-2024-001', 2);

-- Display success message
SELECT 'Database setup completed successfully!' as message;

