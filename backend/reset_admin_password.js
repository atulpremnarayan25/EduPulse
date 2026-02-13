const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { Admin } = require('./models');

dotenv.config();

const resetAdminPassword = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined');
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const email = 'admin@edupulse.com';
        const newPassword = 'admin123';

        const admin = await Admin.findOne({ email });
        if (!admin) {
            console.error(`Admin with email ${email} not found!`);
            process.exit(1);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        admin.password = hashedPassword;
        await admin.save();

        console.log('----------------------------------');
        console.log('✅ Admin Password Reset Successfully');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 New Password: ${newPassword}`);
        console.log('----------------------------------');
        console.log('⚠️  IMPORTANT: Login and change this password immediately!');

        process.exit(0);
    } catch (error) {
        console.error('Error resetting password:', error);
        process.exit(1);
    }
};

resetAdminPassword();
