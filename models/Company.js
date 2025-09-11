const { executeQuery, getOne } = require('../config/database');

class Company {
    constructor(companyData) {
        this.id = companyData.id;
        this.company_name = companyData.company_name;
        this.company_email = companyData.company_email;
        this.company_phone = companyData.company_phone;
        this.company_address = companyData.company_address;
        this.contact_person = companyData.contact_person;
        this.is_active = companyData.is_active;
        this.created_at = companyData.created_at;
        this.updated_at = companyData.updated_at;
    }

    // Get all active companies
    static async getAll() {
        try {
            const query = 'SELECT * FROM companies WHERE is_active = 1 ORDER BY company_name ASC';
            const result = await executeQuery(query);
            
            if (result.success) {
                return result.data.map(companyData => new Company(companyData));
            }
            return [];
        } catch (error) {
            console.error('Error getting all companies:', error);
            return [];
        }
    }

    // Find company by ID
    static async findById(id) {
        try {
            const query = 'SELECT * FROM companies WHERE id = ? AND is_active = 1';
            const result = await getOne(query, [id]);
            
            if (result.success && result.data) {
                return new Company(result.data);
            }
            return null;
        } catch (error) {
            console.error('Error finding company by ID:', error);
            return null;
        }
    }

    // Create new company
    static async create(companyData) {
        try {
            const query = `
                INSERT INTO companies (company_name, company_email, company_phone, company_address, contact_person) 
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const result = await executeQuery(query, [
                companyData.company_name,
                companyData.company_email || null,
                companyData.company_phone || null,
                companyData.company_address || null,
                companyData.contact_person || null
            ]);

            if (result.success) {
                return await Company.findById(result.data.insertId);
            }
            return null;
        } catch (error) {
            console.error('Error creating company:', error);
            return null;
        }
    }

    // Update company
    async update(updateData) {
        try {
            const fields = [];
            const values = [];

            if (updateData.company_name) {
                fields.push('company_name = ?');
                values.push(updateData.company_name);
            }
            if (updateData.company_email !== undefined) {
                fields.push('company_email = ?');
                values.push(updateData.company_email);
            }
            if (updateData.company_phone !== undefined) {
                fields.push('company_phone = ?');
                values.push(updateData.company_phone);
            }
            if (updateData.company_address !== undefined) {
                fields.push('company_address = ?');
                values.push(updateData.company_address);
            }
            if (updateData.contact_person !== undefined) {
                fields.push('contact_person = ?');
                values.push(updateData.contact_person);
            }

            if (fields.length === 0) {
                return false;
            }

            values.push(this.id);
            const query = `UPDATE companies SET ${fields.join(', ')} WHERE id = ?`;
            
            const result = await executeQuery(query, values);
            return result.success;
        } catch (error) {
            console.error('Error updating company:', error);
            return false;
        }
    }

    // Deactivate company (soft delete)
    async deactivate() {
        try {
            const query = 'UPDATE companies SET is_active = 0 WHERE id = ?';
            const result = await executeQuery(query, [this.id]);
            return result.success;
        } catch (error) {
            console.error('Error deactivating company:', error);
            return false;
        }
    }

    // Get company statistics
    static async getStats() {
        try {
            const query = 'SELECT COUNT(*) as total FROM companies WHERE is_active = 1';
            const result = await getOne(query);
            
            if (result.success && result.data) {
                return result.data.total;
            }
            return 0;
        } catch (error) {
            console.error('Error getting company stats:', error);
            return 0;
        }
    }

    // Search companies
    static async search(searchTerm) {
        try {
            const query = `
                SELECT * FROM companies 
                WHERE is_active = 1 
                AND (company_name LIKE ? OR contact_person LIKE ? OR company_email LIKE ?)
                ORDER BY company_name ASC
            `;
            const searchPattern = `%${searchTerm}%`;
            const result = await executeQuery(query, [searchPattern, searchPattern, searchPattern]);
            
            if (result.success) {
                return result.data.map(companyData => new Company(companyData));
            }
            return [];
        } catch (error) {
            console.error('Error searching companies:', error);
            return [];
        }
    }

    // Get companies with medicine count
    static async getWithMedicineCount() {
        try {
            const query = `
                SELECT c.*, COUNT(m.id) as medicine_count
                FROM companies c
                LEFT JOIN medicines m ON c.id = m.company_id AND m.is_active = 1
                WHERE c.is_active = 1
                GROUP BY c.id
                ORDER BY c.company_name ASC
            `;
            const result = await executeQuery(query);
            
            if (result.success) {
                return result.data.map(row => ({
                    ...new Company(row),
                    medicine_count: row.medicine_count
                }));
            }
            return [];
        } catch (error) {
            console.error('Error getting companies with medicine count:', error);
            return [];
        }
    }

    // Convert to JSON
    toJSON() {
        return {
            id: this.id,
            company_name: this.company_name,
            company_email: this.company_email,
            company_phone: this.company_phone,
            company_address: this.company_address,
            contact_person: this.contact_person,
            is_active: this.is_active,
            created_at: this.created_at,
            updated_at: this.updated_at
        };
    }
}

module.exports = Company;

