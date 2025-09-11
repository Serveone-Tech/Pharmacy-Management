# Pharmacy Management System

A comprehensive web-based Pharmacy Management System built with Node.js, Express.js, MySQL, and Bootstrap. This system helps pharmacists and pharmacy administrators manage their operations efficiently with role-based access control.

## 🚀 Features

### Admin Module
- **Dashboard**: Real-time statistics and overview
  - Total Pharmacists, Medical Companies, Medicines
  - Sales summary (Today, Yesterday, Last 7 Days)
  - Total Invoices count
- **Medicine Inventory**: View and manage medicine stock levels
- **Pharmacy Companies**: Add and update company details
- **Medicines**: Complete CRUD operations for medicine records
- **Pharmacists**: Manage pharmacist accounts
- **Invoice Search**: Search invoices by number or mobile
- **Reports**: Comprehensive sales reporting
  - Date range filtering
  - Pharmacist-wise reports
  - Year-wise sales summary
- **Profile Management**: Update profile and change password

### Pharmacist Module
- **Dashboard**: Personal sales overview
  - Today's Sales and Invoices
  - Yesterday's Sales
  - Last 7 Days Sales
- **Point of Sale (POS)**: Advanced sales interface
  - Real-time medicine search
  - Shopping cart functionality
  - Customer information capture
  - Multiple payment methods
  - Discount calculations
- **Inventory**: Check available medicine stock
- **Invoice Search**: View and search personal invoices
- **Sales Reports**: Personal performance tracking
- **Profile Management**: Update personal information

## 🛠️ Technology Stack

- **Backend**: Node.js + Express.js
- **Database**: MySQL
- **Frontend**: Bootstrap 5 + EJS Templates
- **Authentication**: Session-based with bcrypt password hashing
- **Validation**: Express-validator
- **UI**: Responsive design with Font Awesome icons

## 📋 Prerequisites

- Node.js (v14 or higher)
- MySQL Server (v8.0 or higher)
- npm (Node Package Manager)

## 🔧 Installation

1. **Clone or extract the project**
   ```bash
   cd pharmacy-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up MySQL Database**
   ```bash
   # Start MySQL service
   sudo systemctl start mysql
   
   # Login to MySQL as root
   sudo mysql -u root
   
   # Create database and user
   CREATE DATABASE pharmacy_management;
   CREATE USER 'pharmacy_user'@'localhost' IDENTIFIED BY 'pharmacy_password';
   GRANT ALL PRIVILEGES ON pharmacy_management.* TO 'pharmacy_user'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

4. **Import Database Schema**
   ```bash
   mysql -u pharmacy_user -p pharmacy_management < database_setup.sql
   ```

5. **Configure Environment Variables**
   Update the `.env` file with your database credentials:
   ```env
   DB_HOST=localhost
   DB_USER=pharmacy_user
   DB_PASSWORD=pharmacy_password
   DB_NAME=pharmacy_management
   SESSION_SECRET=your-secret-key-here
   PORT=3000
   ```

6. **Start the Application**
   ```bash
   npm start
   ```

7. **Access the Application**
   Open your browser and navigate to `http://localhost:3000`

## 👤 Default Login Credentials

### Admin Account
- **Email**: admin@pharmacy.com
- **Password**: admin123

### Pharmacist Account
- **Email**: pharmacist@pharmacy.com
- **Password**: pharmacist123

## 📁 Project Structure

```
pharmacy-management-system/
├── config/
│   └── database.js          # Database configuration
├── controllers/             # Route controllers (future enhancement)
├── middleware/
│   └── auth.js             # Authentication middleware
├── models/
│   ├── User.js             # User model
│   ├── Company.js          # Company model
│   ├── Medicine.js         # Medicine model
│   └── Invoice.js          # Invoice model
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── admin.js            # Admin routes
│   └── pharmacist.js       # Pharmacist routes
├── views/
│   ├── auth/               # Authentication templates
│   ├── admin/              # Admin templates
│   ├── pharmacist/         # Pharmacist templates
│   └── partials/           # Shared templates
├── public/
│   ├── css/                # Custom stylesheets
│   ├── js/                 # Custom JavaScript
│   └── images/             # Static images
├── uploads/                # File uploads directory
├── app.js                  # Main application file
├── package.json            # Dependencies and scripts
├── database_setup.sql      # Database schema and sample data
└── README.md              # This file
```

## 🔒 Security Features

- **Password Hashing**: bcrypt for secure password storage
- **Session Management**: Express-session with secure configuration
- **Input Validation**: Express-validator for form validation
- **SQL Injection Protection**: Parameterized queries
- **Role-based Access Control**: Middleware-based route protection
- **CSRF Protection**: Built-in form validation

## 📊 Database Schema

The system uses a well-structured MySQL database with the following main tables:

- **users**: Store admin and pharmacist accounts
- **companies**: Pharmacy companies information
- **medicines**: Medicine inventory and details
- **invoices**: Sales transaction records
- **invoice_items**: Individual items in each invoice

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   - Set NODE_ENV=production
   - Use strong session secrets
   - Configure proper database credentials
   - Set up SSL certificates

2. **Database Configuration**
   - Use production MySQL server
   - Set up regular backups
   - Configure proper user permissions

3. **Application Deployment**
   - Use PM2 for process management
   - Set up reverse proxy (Nginx)
   - Configure logging and monitoring

### Docker Deployment (Optional)

```dockerfile
# Dockerfile example
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| DB_HOST | MySQL host | localhost |
| DB_USER | MySQL username | pharmacy_user |
| DB_PASSWORD | MySQL password | pharmacy_password |
| DB_NAME | Database name | pharmacy_management |
| SESSION_SECRET | Session encryption key | random-secret |
| PORT | Application port | 3000 |

### Application Settings

- **Session Timeout**: 24 hours
- **Password Requirements**: Minimum 6 characters
- **File Upload Limit**: 10MB
- **Low Stock Threshold**: Configurable per medicine

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL service status
   - Verify database credentials
   - Ensure database exists

2. **Login Issues**
   - Verify user accounts exist in database
   - Check password hashing
   - Clear browser cache/cookies

3. **Permission Errors**
   - Check file permissions
   - Verify MySQL user privileges
   - Ensure uploads directory is writable

### Logs

Application logs are available in:
- Console output (development)
- Log files (production setup)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the documentation

## 🔄 Version History

- **v1.0.0**: Initial release with full functionality
  - Admin and Pharmacist modules
  - Complete inventory management
  - Sales and reporting system
  - Responsive web interface

## 🎯 Future Enhancements

- **Mobile App**: React Native mobile application
- **API Integration**: RESTful API for third-party integrations
- **Advanced Analytics**: Charts and graphs for better insights
- **Barcode Scanning**: Medicine barcode integration
- **SMS Notifications**: Customer and low stock alerts
- **Multi-location**: Support for multiple pharmacy branches
- **Prescription Management**: Digital prescription handling

---

**Built with ❤️ for efficient pharmacy management**

