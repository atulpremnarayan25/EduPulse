const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

// Import Admin model
const { Admin } = require('./models');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@edupulse.com' });
        if (existingAdmin) {
            console.log('Admin already exists!');
            console.log('Email: admin@edupulse.com');
            process.exit(0);
        }

        // Create default admin
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);

        const admin = await Admin.create({
            name: 'Admin',
            email: 'admin@edupulse.com',
            password: hashedPassword
        });

        console.log('Default admin created successfully!');
        console.log('----------------------------------');
        console.log('Email: admin@edupulse.com');
        console.log('Password: admin123');
        console.log('----------------------------------');
        console.log('⚠️  IMPORTANT: Change this password after first login!');

        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error);
        process.exit(1);
    }
};

seedAdmin();
