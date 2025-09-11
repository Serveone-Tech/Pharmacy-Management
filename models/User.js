const { executeQuery, getOne } = require("../config/database");
const bcrypt = require("bcryptjs");

class User {
  constructor(userData) {
    this.id = userData.id;
    this.full_name = userData.full_name;
    this.email = userData.email;
    this.mobile = userData.mobile;
    this.role = userData.role;
    this.address = userData.address;
    this.is_active = userData.is_active;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
    this.password = userData.password; // add password to user object
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      // Include password field in query
      const query = "SELECT * FROM users WHERE email = ? AND is_active = 1";
      const result = await getOne(query, [email]);

      if (result.success && result.data) {
        return new User(result.data);
      }
      return null;
    } catch (error) {
      console.error("Error finding user by email:", error);
      return null;
    }
  }

  // Find user by ID
  static async findById(id) {
    try {
      const query = "SELECT * FROM users WHERE id = ? AND is_active = 1";
      const result = await getOne(query, [id]);

      if (result.success && result.data) {
        return new User(result.data);
      }
      return null;
    } catch (error) {
      console.error("Error finding user by ID:", error);
      return null;
    }
  }

  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      const hashed = await User.hashPassword("123456");
      console.log("hashed12", hashed);
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  }

  // Hash password
  static async hashPassword(password) {
    try {
      const saltRounds = 10;
      return await bcrypt.hash(password, saltRounds);
    } catch (error) {
      console.error("Error hashing password:", error);
      throw error;
    }
  }

  // Create new user
  static async create(userData) {
    try {
      const hashedPassword = await User.hashPassword(userData.password);

      const query = `
                INSERT INTO users (full_name, email, mobile, password, role, address) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;

      const result = await executeQuery(query, [
        userData.full_name,
        userData.email,
        userData.mobile,
        hashedPassword,
        userData.role,
        userData.address || null,
      ]);

      if (result.success) {
        return await User.findById(result.data.insertId);
      }
      return null;
    } catch (error) {
      console.error("Error creating user:", error);
      return null;
    }
  }

  // Update user
  async update(updateData) {
    try {
      const fields = [];
      const values = [];

      if (updateData.full_name) {
        fields.push("full_name = ?");
        values.push(updateData.full_name);
      }
      if (updateData.email) {
        fields.push("email = ?");
        values.push(updateData.email);
      }
      if (updateData.mobile) {
        fields.push("mobile = ?");
        values.push(updateData.mobile);
      }
      if (updateData.address) {
        fields.push("address = ?");
        values.push(updateData.address);
      }
      if (updateData.password) {
        const hashedPassword = await User.hashPassword(updateData.password);
        fields.push("password = ?");
        values.push(hashedPassword);
      }

      if (fields.length === 0) {
        return false;
      }

      values.push(this.id);
      const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;

      const result = await executeQuery(query, values);
      return result.success;
    } catch (error) {
      console.error("Error updating user:", error);
      return false;
    }
  }

  // Get all users by role
  static async getAllByRole(role) {
    try {
      const query =
        "SELECT * FROM users WHERE role = ? AND is_active = 1 ORDER BY created_at DESC";
      const result = await executeQuery(query, [role]);

      if (result.success) {
        return result.data.map((userData) => new User(userData));
      }
      return [];
    } catch (error) {
      console.error("Error getting users by role:", error);
      return [];
    }
  }

  // Get all pharmacists
  static async getAllPharmacists() {
    return await User.getAllByRole("pharmacist");
  }

  // Deactivate user (soft delete)
  async deactivate() {
    try {
      const query = "UPDATE users SET is_active = 0 WHERE id = ?";
      const result = await executeQuery(query, [this.id]);
      return result.success;
    } catch (error) {
      console.error("Error deactivating user:", error);
      return false;
    }
  }

  // Get user statistics
  static async getStats() {
    try {
      const query = `
                SELECT 
                    role,
                    COUNT(*) as count
                FROM users 
                WHERE is_active = 1 
                GROUP BY role
            `;

      const result = await executeQuery(query);

      if (result.success) {
        const stats = { admin: 0, pharmacist: 0 };
        result.data.forEach((row) => {
          stats[row.role] = row.count;
        });
        return stats;
      }
      return { admin: 0, pharmacist: 0 };
    } catch (error) {
      console.error("Error getting user stats:", error);
      return { admin: 0, pharmacist: 0 };
    }
  }

  // Convert to JSON (remove sensitive data)
  toJSON() {
    return {
      id: this.id,
      full_name: this.full_name,
      email: this.email,
      mobile: this.mobile,
      role: this.role,
      address: this.address,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at,
      // password is excluded from JSON output for security
    };
  }
}

module.exports = User;
