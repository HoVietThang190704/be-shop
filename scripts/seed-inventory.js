const mongoose = require('mongoose');
const Product = require('../schemas/products');
const Inventory = require('../schemas/inventories');

const MONGO_URI = 'mongodb://localhost:27017/NNPTUD-C4';

async function seedInventory() {
    try {
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
