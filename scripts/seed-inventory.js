const mongoose = require('mongoose');
const dns = require('dns');
const dnsPromises = dns.promises;
require('dotenv').config();

const Product = require('../schemas/products');
const Inventory = require('../schemas/inventories');

const MONGO_URI = process.env.MONGO_URI;

async function seedInventory() {
    try {
        // Optional: force DNS resolution through Google's resolvers to avoid local SRV issues
        if (process.env.FORCE_GOOGLE_DNS === 'true') {
            dns.setServers(['8.8.8.8', '8.8.4.4']);
            dnsPromises.setServers(['1.1.1.1', '8.8.8.8']);
            console.log('🌐 Using Google DNS servers for resolution');
        }

        console.log('--- Inventory Seeding Started ---');
        
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Fetch all products
        const products = await Product.find({});
        console.log(`📦 Found ${products.length} products. Initializing inventory (1000 items each)...`);

        let count = 0;
        for (const product of products) {
            // Upsert inventory record: create if doesn't exist, update if it does
            await Inventory.findOneAndUpdate(
                { product: product._id },
                { 
                    $set: { 
                        stock: 1000,
                        reserved: 0, // Reset reserved for testing
                        soldCount: 0  // Reset soldCount for testing
                    } 
                },
                { upsert: true, new: true }
            );
            count++;
            if (count % 10 === 0) console.log(`   ...processed ${count} products`);
        }

        console.log(`✅ Successfully initialized inventory for ${count} products.`);
        console.log('--- Inventory Seeding Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding inventory:', error);
        process.exit(1);
    }
}

seedInventory();
