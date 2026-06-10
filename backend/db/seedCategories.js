// Script to seed activity categories into the database
// Run with: node db/seedCategories.js

import db from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedCategories() {
    try {
        console.log('🌱 Starting category seeding...');
        
        // Read the SQL file
        const sqlFilePath = path.join(__dirname, 'seed_categories.sql');
        const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
        
        // Execute the SQL
        await db.none(sqlContent);
        
        console.log('✅ Categories seeded successfully!');
        
        // Verify the insert
        const count = await db.one('SELECT COUNT(*) FROM event_categories WHERE status = $1', ['approved']);
        console.log(`📊 Total approved categories: ${count.count}`);
        
        // Show grouped summary
        const summary = await db.any(`
            SELECT 
                SPLIT_PART(name, ' - ', 1) as main_category,
                COUNT(*) as count
            FROM event_categories
            WHERE status = 'approved'
            GROUP BY SPLIT_PART(name, ' - ', 1)
            ORDER BY main_category
        `);
        
        console.log('\n📋 Categories by type:');
        summary.forEach(item => {
            console.log(`   ${item.main_category}: ${item.count} subcategories`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding categories:', error.message);
        process.exit(1);
    }
}

seedCategories();
