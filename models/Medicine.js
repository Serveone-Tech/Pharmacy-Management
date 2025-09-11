const { executeQuery, getOne } = require('../config/database');

class Medicine {
    constructor(medicineData) {
        this.id = medicineData.id;
        this.medicine_name = medicineData.medicine_name;
        this.generic_name = medicineData.generic_name;
        this.company_id = medicineData.company_id;
        this.medicine_type = medicineData.medicine_type;
        this.buying_price = medicineData.buying_price;
        this.selling_price = medicineData.selling_price;
        this.quantity_in_stock = medicineData.quantity_in_stock;
        this.min_stock_level = medicineData.min_stock_level;
        this.expiry_date = medicineData.expiry_date;
        this.batch_number = medicineData.batch_number;
        this.description = medicineData.description;
        this.is_active = medicineData.is_active;
        this.created_at = medicineData.created_at;
        this.updated_at = medicineData.updated_at;
        
        // Additional fields from joins
        this.company_name = medicineData.company_name;
    }

    // Get all active medicines
    static async getAll() {
        try {
            const query = `
                SELECT m.*, c.company_name 
                FROM medicines m
                LEFT JOIN companies c ON m.company_id = c.id
                WHERE m.is_active = 1 
                ORDER BY m.medicine_name ASC
            `;
            const result = await executeQuery(query);
            
            if (result.success) {
                return result.data.map(medicineData => new Medicine(medicineData));
            }
            return [];
        } catch (error) {
            console.error('Error getting all medicines:', error);
            return [];
        }
    }

    // Find medicine by ID
    static async findById(id) {
        try {
            const query = `
                SELECT m.*, c.company_name 
                FROM medicines m
                LEFT JOIN companies c ON m.company_id = c.id
                WHERE m.id = ? AND m.is_active = 1
            `;
            const result = await getOne(query, [id]);
            
            if (result.success && result.data) {
                return new Medicine(result.data);
            }
            return null;
        } catch (error) {
            console.error('Error finding medicine by ID:', error);
            return null;
        }
    }

    // Create new medicine
    static async create(medicineData) {
        try {
            const query = `
                INSERT INTO medicines (
                    medicine_name, generic_name, company_id, medicine_type, 
                    buying_price, selling_price, quantity_in_stock, min_stock_level,
                    expiry_date, batch_number, description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const result = await executeQuery(query, [
                medicineData.medicine_name,
                medicineData.generic_name || null,
                medicineData.company_id || null,
                medicineData.medicine_type,
                medicineData.buying_price,
                medicineData.selling_price,
                medicineData.quantity_in_stock || 0,
                medicineData.min_stock_level || 10,
                medicineData.expiry_date || null,
                medicineData.batch_number || null,
                medicineData.description || null
            ]);

            if (result.success) {
                return await Medicine.findById(result.data.insertId);
            }
            return null;
        } catch (error) {
            console.error('Error creating medicine:', error);
            return null;
        }
    }

    // Update medicine
    async update(updateData) {
        try {
            const fields = [];
            const values = [];

            if (updateData.medicine_name) {
                fields.push('medicine_name = ?');
                values.push(updateData.medicine_name);
            }
            if (updateData.generic_name !== undefined) {
                fields.push('generic_name = ?');
                values.push(updateData.generic_name);
            }
            if (updateData.company_id !== undefined) {
                fields.push('company_id = ?');
                values.push(updateData.company_id);
            }
            if (updateData.medicine_type) {
                fields.push('medicine_type = ?');
                values.push(updateData.medicine_type);
            }
            if (updateData.buying_price !== undefined) {
                fields.push('buying_price = ?');
                values.push(updateData.buying_price);
            }
            if (updateData.selling_price !== undefined) {
                fields.push('selling_price = ?');
                values.push(updateData.selling_price);
            }
            if (updateData.quantity_in_stock !== undefined) {
                fields.push('quantity_in_stock = ?');
                values.push(updateData.quantity_in_stock);
            }
            if (updateData.min_stock_level !== undefined) {
                fields.push('min_stock_level = ?');
                values.push(updateData.min_stock_level);
            }
            if (updateData.expiry_date !== undefined) {
                fields.push('expiry_date = ?');
                values.push(updateData.expiry_date);
            }
            if (updateData.batch_number !== undefined) {
                fields.push('batch_number = ?');
                values.push(updateData.batch_number);
            }
            if (updateData.description !== undefined) {
                fields.push('description = ?');
                values.push(updateData.description);
            }

            if (fields.length === 0) {
                return false;
            }

            values.push(this.id);
            const query = `UPDATE medicines SET ${fields.join(', ')} WHERE id = ?`;
            
            const result = await executeQuery(query, values);
            return result.success;
        } catch (error) {
            console.error('Error updating medicine:', error);
            return false;
        }
    }

    // Update stock quantity
    async updateStock(newQuantity) {
        try {
            const query = 'UPDATE medicines SET quantity_in_stock = ? WHERE id = ?';
            const result = await executeQuery(query, [newQuantity, this.id]);
            return result.success;
        } catch (error) {
            console.error('Error updating medicine stock:', error);
            return false;
        }
    }

    // Deactivate medicine (soft delete)
    async deactivate() {
        try {
            const query = 'UPDATE medicines SET is_active = 0 WHERE id = ?';
            const result = await executeQuery(query, [this.id]);
            return result.success;
        } catch (error) {
            console.error('Error deactivating medicine:', error);
            return false;
        }
    }

    // Get medicine statistics
    static async getStats() {
        try {
            const query = 'SELECT COUNT(*) as total FROM medicines WHERE is_active = 1';
            const result = await getOne(query);
            
            if (result.success && result.data) {
                return result.data.total;
            }
            return 0;
        } catch (error) {
            console.error('Error getting medicine stats:', error);
            return 0;
        }
    }

    // Get low stock medicines
    static async getLowStock() {
        try {
            const query = `
                SELECT m.*, c.company_name 
                FROM medicines m
                LEFT JOIN companies c ON m.company_id = c.id
                WHERE m.is_active = 1 AND m.quantity_in_stock <= m.min_stock_level
                ORDER BY m.quantity_in_stock ASC
            `;
            const result = await executeQuery(query);
            
            if (result.success) {
                return result.data.map(medicineData => new Medicine(medicineData));
            }
            return [];
        } catch (error) {
            console.error('Error getting low stock medicines:', error);
            return [];
        }
    }

    // Get expired medicines
    static async getExpired() {
        try {
            const query = `
                SELECT m.*, c.company_name 
                FROM medicines m
                LEFT JOIN companies c ON m.company_id = c.id
                WHERE m.is_active = 1 AND m.expiry_date < CURDATE()
                ORDER BY m.expiry_date ASC
            `;
            const result = await executeQuery(query);
            
            if (result.success) {
                return result.data.map(medicineData => new Medicine(medicineData));
            }
            return [];
        } catch (error) {
            console.error('Error getting expired medicines:', error);
            return [];
        }
    }

    // Search medicines
    static async search(searchTerm) {
        try {
            const query = `
                SELECT m.*, c.company_name 
                FROM medicines m
                LEFT JOIN companies c ON m.company_id = c.id
                WHERE m.is_active = 1 
                AND (m.medicine_name LIKE ? OR m.generic_name LIKE ? OR c.company_name LIKE ?)
                ORDER BY m.medicine_name ASC
            `;
            const searchPattern = `%${searchTerm}%`;
            const result = await executeQuery(query, [searchPattern, searchPattern, searchPattern]);
            
            if (result.success) {
                return result.data.map(medicineData => new Medicine(medicineData));
            }
            return [];
        } catch (error) {
            console.error('Error searching medicines:', error);
            return [];
        }
    }

    // Get medicines by company
    static async getByCompany(companyId) {
        try {
            const query = `
                SELECT m.*, c.company_name 
                FROM medicines m
                LEFT JOIN companies c ON m.company_id = c.id
                WHERE m.is_active = 1 AND m.company_id = ?
                ORDER BY m.medicine_name ASC
            `;
            const result = await executeQuery(query, [companyId]);
            
            if (result.success) {
                return result.data.map(medicineData => new Medicine(medicineData));
            }
            return [];
        } catch (error) {
            console.error('Error getting medicines by company:', error);
            return [];
        }
    }

    // Check if medicine is low in stock
    isLowStock() {
        return this.quantity_in_stock <= this.min_stock_level;
    }

    // Check if medicine is expired
    isExpired() {
        if (!this.expiry_date) return false;
        const today = new Date();
        const expiryDate = new Date(this.expiry_date);
        return expiryDate < today;
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            medicine_name: this.medicine_name,
            generic_name: this.generic_name,
            company_id: this.company_id,
            company_name: this.company_name,
            medicine_type: this.medicine_type,
            buying_price: this.buying_price,
            selling_price: this.selling_price,
            quantity_in_stock: this.quantity_in_stock,
            min_stock_level: this.min_stock_level,
            expiry_date: this.expiry_date,
            batch_number: this.batch_number,
            description: this.description,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at,
            is_low_stock: this.isLowStock(),
            is_expired: this.isExpired()
        };
    }
}

module.exports = Medicine;

