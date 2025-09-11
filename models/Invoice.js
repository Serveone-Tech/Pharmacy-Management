const { executeQuery, getOne, beginTransaction, commitTransaction, rollbackTransaction } = require('../config/database');

class Invoice {
    constructor(invoiceData) {
        this.id = invoiceData.id;
        this.invoice_number = invoiceData.invoice_number;
        this.customer_name = invoiceData.customer_name;
        this.customer_mobile = invoiceData.customer_mobile;
        this.customer_address = invoiceData.customer_address;
        this.pharmacist_id = invoiceData.pharmacist_id;
        this.total_amount = invoiceData.total_amount;
        this.discount_amount = invoiceData.discount_amount;
        this.final_amount = invoiceData.final_amount;
        this.payment_method = invoiceData.payment_method;
        this.invoice_date = invoiceData.invoice_date;
        this.created_at = invoiceData.created_at;
        this.updated_at = invoiceData.updated_at;
        
        // Additional fields from joins
        this.pharmacist_name = invoiceData.pharmacist_name;
        this.items = invoiceData.items || [];
    }

    // Generate unique invoice number
    static async generateInvoiceNumber() {
        try {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            
            const prefix = `INV-${year}${month}${day}`;
            
            // Get the last invoice number for today
            const query = `
                SELECT invoice_number 
                FROM invoices 
                WHERE invoice_number LIKE ? 
                ORDER BY id DESC 
                LIMIT 1
            `;
            
            const result = await getOne(query, [`${prefix}%`]);
            
            let sequence = 1;
            if (result.success && result.data) {
                const lastNumber = result.data.invoice_number;
                const lastSequence = parseInt(lastNumber.split('-').pop());
                sequence = lastSequence + 1;
            }
            
            return `${prefix}-${String(sequence).padStart(3, '0')}`;
        } catch (error) {
            console.error('Error generating invoice number:', error);
            return `INV-${Date.now()}`;
        }
    }

    // Get all invoices with pharmacist details
    static async getAll(limit = 50, offset = 0) {
        try {
            const query = `
                SELECT i.*, u.full_name as pharmacist_name
                FROM invoices i
                LEFT JOIN users u ON i.pharmacist_id = u.id
                ORDER BY i.created_at DESC
                LIMIT ? OFFSET ?
            `;
            const result = await executeQuery(query, [limit, offset]);
            
            if (result.success) {
                return result.data.map(invoiceData => new Invoice(invoiceData));
            }
            return [];
        } catch (error) {
            console.error('Error getting all invoices:', error);
            return [];
        }
    }

    // Find invoice by ID with items
    static async findById(id) {
        try {
            const invoiceQuery = `
                SELECT i.*, u.full_name as pharmacist_name
                FROM invoices i
                LEFT JOIN users u ON i.pharmacist_id = u.id
                WHERE i.id = ?
            `;
            const invoiceResult = await getOne(invoiceQuery, [id]);
            
            if (!invoiceResult.success || !invoiceResult.data) {
                return null;
            }

            const itemsQuery = `
                SELECT ii.*, m.medicine_name, m.generic_name, c.company_name, ii.unit_price as selling_price
                FROM invoice_items ii
                LEFT JOIN medicines m ON ii.medicine_id = m.id
                LEFT JOIN companies c ON m.company_id = c.id
                WHERE ii.invoice_id = ?
                ORDER BY ii.id ASC
            `;
            const itemsResult = await executeQuery(itemsQuery, [id]);
            
            const invoice = new Invoice(invoiceResult.data);
            if (itemsResult.success) {
                invoice.items = itemsResult.data;
            }
            
            return invoice;
        } catch (error) {
            console.error('Error finding invoice by ID:', error);
            return null;
        }
    }

    // Find invoice by invoice number
    static async findByInvoiceNumber(invoiceNumber) {
        try {
            const query = `
                SELECT i.*, u.full_name as pharmacist_name
                FROM invoices i
                LEFT JOIN users u ON i.pharmacist_id = u.id
                WHERE i.invoice_number = ?
            `;
            const result = await getOne(query, [invoiceNumber]);
            
            if (result.success && result.data) {
                return await Invoice.findById(result.data.id);
            }
            return null;
        } catch (error) {
            console.error('Error finding invoice by number:', error);
            return null;
        }
    }

    // Search invoices by invoice number or mobile
    static async search(searchTerm) {
        try {
            const query = `
                SELECT i.*, u.full_name as pharmacist_name
                FROM invoices i
                LEFT JOIN users u ON i.pharmacist_id = u.id
                WHERE i.invoice_number LIKE ? OR i.customer_mobile LIKE ?
                ORDER BY i.created_at DESC
                LIMIT 20
            `;
            const searchPattern = `%${searchTerm}%`;
            const result = await executeQuery(query, [searchPattern, searchPattern]);
            
            if (result.success) {
                return result.data.map(invoiceData => new Invoice(invoiceData));
            }
            return [];
        } catch (error) {
            console.error('Error searching invoices:', error);
            return [];
        }
    }

    // Create new invoice with items
    static async create(invoiceData, items) {
        const connection = await beginTransaction();
        
        try {
            // Generate invoice number
            const invoiceNumber = await Invoice.generateInvoiceNumber();
            
            // Insert invoice
            const invoiceQuery = `
                INSERT INTO invoices (
                    invoice_number, customer_name, customer_mobile, customer_address,
                    pharmacist_id, total_amount, discount_amount, final_amount,
                    payment_method, invoice_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [invoiceResult] = await connection.execute(invoiceQuery, [
                invoiceNumber,
                invoiceData.customer_name || null,
                invoiceData.customer_mobile || null,
                invoiceData.customer_address || null,
                invoiceData.pharmacist_id,
                invoiceData.total_amount,
                invoiceData.discount_amount || 0,
                invoiceData.final_amount,
                invoiceData.payment_method || 'cash',
                invoiceData.invoice_date || new Date().toISOString().split('T')[0]
            ]);

            const invoiceId = invoiceResult.insertId;

            // Insert invoice items and update stock
            for (const item of items) {
                // Insert invoice item
                const itemQuery = `
                    INSERT INTO invoice_items (invoice_id, medicine_id, quantity, unit_price, total_price)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                await connection.execute(itemQuery, [
                    invoiceId,
                    item.medicine_id,
                    item.quantity,
                    item.unit_price,
                    item.total_price
                ]);

                // Update medicine stock
                const stockQuery = 'UPDATE medicines SET quantity_in_stock = quantity_in_stock - ? WHERE id = ?';
                await connection.execute(stockQuery, [item.quantity, item.medicine_id]);

                // Insert stock movement record
                const movementQuery = `
                    INSERT INTO stock_movements (medicine_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
                    VALUES (?, 'out', ?, 'sale', ?, ?, ?)
                `;
                
                await connection.execute(movementQuery, [
                    item.medicine_id,
                    item.quantity,
                    invoiceId,
                    `Sale via invoice ${invoiceNumber}`,
                    invoiceData.pharmacist_id
                ]);
            }

            await commitTransaction(connection);
            return await Invoice.findById(invoiceId);
            
        } catch (error) {
            await rollbackTransaction(connection);
            console.error('Error creating invoice:', error);
            return null;
        }
    }

    // Get sales statistics
    static async getSalesStats(pharmacistId = null, dateFrom = null, dateTo = null) {
        try {
            let query = `
                SELECT 
                    COUNT(*) as total_invoices,
                    SUM(final_amount) as total_sales,
                    AVG(final_amount) as average_sale
                FROM invoices 
                WHERE 1=1
            `;
            const params = [];

            if (pharmacistId) {
                query += ' AND pharmacist_id = ?';
                params.push(pharmacistId);
            }

            if (dateFrom) {
                query += ' AND invoice_date >= ?';
                params.push(dateFrom);
            }

            if (dateTo) {
                query += ' AND invoice_date <= ?';
                params.push(dateTo);
            }

            const result = await getOne(query, params);
            
            if (result.success && result.data) {
                return {
                    total_invoices: result.data.total_invoices || 0,
                    total_sales: parseFloat(result.data.total_sales) || 0,
                    average_sale: parseFloat(result.data.average_sale) || 0
                };
            }
            return { total_invoices: 0, total_sales: 0, average_sale: 0 };
        } catch (error) {
            console.error('Error getting sales stats:', error);
            return { total_invoices: 0, total_sales: 0, average_sale: 0 };
        }
    }

    // Get today's sales
    static async getTodaySales(pharmacistId = null) {
        const today = new Date().toISOString().split('T')[0];
        return await Invoice.getSalesStats(pharmacistId, today, today);
    }

    // Get yesterday's sales
    static async getYesterdaySales(pharmacistId = null) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        return await Invoice.getSalesStats(pharmacistId, yesterdayStr, yesterdayStr);
    }

    // Get last 7 days sales
    static async getLast7DaysSales(pharmacistId = null) {
        const today = new Date();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(today.getDate() - 7);
        
        return await Invoice.getSalesStats(
            pharmacistId, 
            sevenDaysAgo.toISOString().split('T')[0], 
            today.toISOString().split('T')[0]
        );
    }

    // Get sales by date range
    static async getSalesByDateRange(dateFrom, dateTo, pharmacistId = null) {
        try {
            let query = `
                SELECT 
                    DATE(invoice_date) as sale_date,
                    COUNT(*) as total_invoices,
                    SUM(final_amount) as total_sales
                FROM invoices 
                WHERE invoice_date BETWEEN ? AND ?
            `;
            const params = [dateFrom, dateTo];

            if (pharmacistId) {
                query += ' AND pharmacist_id = ?';
                params.push(pharmacistId);
            }

            query += ' GROUP BY DATE(invoice_date) ORDER BY sale_date DESC';

            const result = await executeQuery(query, params);
            
            if (result.success) {
                return result.data.map(row => ({
                    sale_date: row.sale_date,
                    total_invoices: row.total_invoices,
                    total_sales: parseFloat(row.total_sales)
                }));
            }
            return [];
        } catch (error) {
            console.error('Error getting sales by date range:', error);
            return [];
        }
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            invoice_number: this.invoice_number,
            customer_name: this.customer_name,
            customer_mobile: this.customer_mobile,
            customer_address: this.customer_address,
            pharmacist_id: this.pharmacist_id,
            pharmacist_name: this.pharmacist_name,
            total_amount: this.total_amount,
            discount_amount: this.discount_amount,
            final_amount: this.final_amount,
            payment_method: this.payment_method,
            invoice_date: this.invoice_date,
            created_at: this.created_at,
            updated_at: this.updated_at,
            items: this.items
        };
    }
}

module.exports = Invoice;