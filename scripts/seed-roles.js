const mongoose = require('mongoose');
require('dotenv').config();

// Import Role Schema
const Role = require('../schemas/roles');

const MONGO_URI = process.env.MONGO_URI;

async function seedRoles() {
    try {
        console.log('--- Role Seeding Started ---');
        
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Define roles to be populated
        const defaultRoles = [
            { name: 'ADMIN', description: 'Administrator with full system access' },
            { name: 'USER', description: 'Standard user with regular privileges' }
        ];

        for (const roleData of defaultRoles) {
            // Check if role already exists
            const existingRole = await Role.findOne({ name: roleData.name });
            
            if (!existingRole) {
                // Create if it doesn't exist
                const newRole = new Role(roleData);
                await newRole.save();
                console.log(`✅ Created role: ${roleData.name}`);
            } else {
                console.log(`ℹ️ Role already exists: ${roleData.name}`);
            }
        }

        console.log('--- Role Seeding Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding roles:', error);
        process.exit(1);
    }
}

seedRoles();
