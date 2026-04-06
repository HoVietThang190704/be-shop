const mongoose = require('mongoose');
const slugify = require('slugify');
const dns = require('dns');
const dnsPromises = dns.promises;
require('dotenv').config();

// Import Schemas
const Product = require('../schemas/products');
const Category = require('../schemas/categories');

const API_URL = 'https://api.escuelajs.co/api/v1/products';
const MONGO_URI = process.env.MONGO_URI;

async function seed() {
    try {
        // Optional: force DNS resolution through Google's resolvers to avoid local SRV issues
        if (process.env.FORCE_GOOGLE_DNS === 'true') {
            dns.setServers(['8.8.8.8', '8.8.4.4']);
            dnsPromises.setServers(['1.1.1.1', '8.8.8.8']);
            console.log('🌐 Using Google DNS servers for resolution');
        }

        console.log('--- Database Seeding Started ---');
        
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🧹 Clearing existing products and categories...');
        await Product.deleteMany({});
        await Category.deleteMany({});
        console.log('✅ Base cleared');

        // Fetch data from API
        console.log(`🌐 Fetching data from ${API_URL}...`);
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        const productsData = await response.json();
        console.log(`📦 Fetched ${productsData.length} products from API`);

        // Process Categories (Unique ones)
        const categoriesMap = new Map(); // name -> objectId

        console.log('📂 Processing categories...');
        for (const item of productsData) {
            const cat = item.category;
            if (!categoriesMap.has(cat.name)) {
                // Check if already in DB (just in case deleteMany failed or we want to append)
                let existingCat = await Category.findOne({ name: cat.name });
                if (!existingCat) {
                    existingCat = new Category({
                        name: cat.name,
                        slug: slugify(cat.name, { lower: true, strict: true }),
                        image: cat.image
                    });
                    await existingCat.save();
                    console.log(`   + Created category: ${cat.name}`);
                }
                categoriesMap.set(cat.name, existingCat._id);
            }
        }

        // Process Products
        console.log('🛒 Processing products...');
        const productsToInsert = [];
        
        for (const item of productsData) {
            // --- DATA CLEANING & FILTERING ---
            
            // 1. Clean image URLs (Platzi API often has malformed strings like '["url"]')
            let cleanedImages = item.images.map(img => {
                try {
                    // If it's a stringified array like '["https://..."]'
                    if (typeof img === 'string' && img.startsWith('[') && img.endsWith(']')) {
                        const parsed = JSON.parse(img);
                        return Array.isArray(parsed) ? parsed[0] : img;
                    }
                } catch (e) {}
                // Fallback: Remove brackets and quotes manually if JSON.parse fails
                return typeof img === 'string' ? img.replace(/[\[\]"]/g, "") : img;
            }).filter(img => img && img.startsWith('http')); // Ensure valid URL

            // 2. Filter out garbage data
            // - Skip if no valid images
            // - Skip if title is purely numeric (like "1241")
            // - Skip if title is too short
            const isNumericTitle = /^\d+$/.test(item.title);
            if (cleanedImages.length === 0 || isNumericTitle || item.title.length < 5) {
                continue; 
            }

            // --- MAPPING ---
            
            const uniqueSlug = slugify(item.title, { lower: true, strict: true }) + '-' + item.id;
            
            productsToInsert.push({
                sku: `SKU-${item.id}`,
                title: item.title, 
                slug: uniqueSlug,
                price: item.price,
                description: item.description,
                images: cleanedImages,
                category: categoriesMap.get(item.category.name),
                isDeleted: false
            });
        }

        // Due to unique: true on Title, we might still hit collisions if API data is messy.
        // We handle this by inserting one by one or using ordered: false if using insertMany.
        try {
            await Product.insertMany(productsToInsert, { ordered: false });
            console.log(`✅ Successfully seeded ${productsToInsert.length} products`);
        } catch (err) {
            if (err.writeErrors) {
                console.log(`⚠️ Some products were skipped due to collisions (Inserted: ${productsToInsert.length - err.writeErrors.length})`);
            } else {
                throw err;
            }
        }

        console.log('--- Seeding Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding data:', error);
        process.exit(1);
    }
}

seed();
