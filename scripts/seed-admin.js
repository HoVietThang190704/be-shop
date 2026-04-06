const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../schemas/users');
const Role = require('../schemas/roles');

const MONGO_URI = process.env.MONGO_URI;

async function seedAdmin() {
    try {
        console.log('--- Admin Account Seeding Started ---');
        
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Check if ADMIN role exists
        const adminRole = await Role.findOne({ name: 'ADMIN' });
        if (!adminRole) {
            console.error('❌ ADMIN role not found. Please run seed-roles.js first.');
            process.exit(1);
        }

        // 2. Define admin details
        const adminData = {
            username: 'admin',
            password: 'Aa@123456', // Pre-save hook in user schema will hash this automatically
            email: 'admin@menshop.com',
            fullName: 'System Administrator',
            role: adminRole._id,
            status: true
        };

        // 3. Create or skip
        const existingAdmin = await User.findOne({ username: adminData.username });
        
        if (!existingAdmin) {
            const newAdmin = new User(adminData);
            await newAdmin.save();
            console.log(`✅ Created admin account: ${adminData.username}`);
            console.log(`🔑 Default Password: adminpassword`);
        } else {
            console.log(`ℹ️ Admin account already exists: ${adminData.username}`);
        }

        console.log('--- Admin Seeding Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding admin:', error);
        process.exit(1);
    }
}

seedAdmin();
