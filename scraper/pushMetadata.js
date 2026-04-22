// step 3: push clean metadata to MongoDB
// dont forget when testing to change part status to "pending"

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const axios = require('axios');
const { MongoClient } = require('mongodb');
const { parseFitmentTags, SCRAPER_CONFIG } = require('./utils'); 
const pLimit = require('p-limit').default || require('p-limit'); 

const uri = process.env.ATLAS_URI;
const client = new MongoClient(uri);
// worker limit, control laptop load
const limit = pLimit(SCRAPER_CONFIG.CONCURRENCY);

const headers = {
    'User-Agent': SCRAPER_CONFIG.USER_AGENT
};

async function runScaleTest() {
    try {
        console.log("☁️  Connecting to MongoDB Atlas...");
        await client.connect();
        const db = client.db('parts-sync-db');

        // MongoDB collections 
        const queue = db.collection('queue');
        const fitmentStore = db.collection('fitment_data');

        // fetch parts not processed yet 
        // limit to 50 per batch to save RAM
        const tasks = await queue.find({ status: "pending" }).limit(SCRAPER_CONFIG.BATCH_SIZE).toArray();

        if (tasks.length === 0) {
            console.log("🏁 No pending tasks found in the cloud queue.");
            return;
        }

        // push parts to MongoDB 
        console.log(`🚀 Starting Multi-Worker Cloud Sync for ${tasks.length} items...`);
        
        const promises = tasks.map((task, i) => {
            return limit(async () => {
                const handle = task.handle;

                try {
                    console.log(`📡 [${i + 1}/${tasks.length}] Fetching Metadata for: ${handle}...`);
                    
                    const productUrl = `https://off-road.ca/products/${handle}.json`;
                    const response = await axios.get(productUrl, { headers });

                    // shopify site metadata  
                    const product = response.data.product;

                    // clean messy metadata  
                    const cleanFitmentList = parseFitmentTags(product.tags);

                    // combine clean metadata with site metadata 
                    const enrichedFitments = cleanFitmentList.map(item => ({ // site metadata 
                        ...item,
                        productId: product.id, 
                        handle: handle,
                        sku: product.variants[0]?.sku || 'MISSING_SKU'
                    }));

                    // now push data to MongoDB collections
                    // car fitment part data: for shopify filtering
                    if (enrichedFitments.length > 0) {
                        await fitmentStore.insertMany(enrichedFitments);
                        console.log(`🚀 Pushed ${enrichedFitments.length} car rows to Cloud Warehouse.`);
                    }

                    // queue: for updating and tracking part status 
                    const sitePrice = parseFloat(product.variants[0]?.price || "0.00");

                    await queue.updateOne(
                        { _id: task._id },
                        { 
                            $set: { 
                                status: "completed", 
                                title: product.title,
                                price: sitePrice, // simulated change script
                                original_price: sitePrice, // store for reverted script 
                                fitmentCount: enrichedFitments.length,
                                last_synced: new Date()
                            } 
                        }
                    );

                    console.log(`✅ Success! [${product.title}] -> Saved to Cloud.`);

                    // fetch delay (prevent IP ban)
                    // Base 3s + Random 0-1.5s Jitter
                    const sleepTime = SCRAPER_CONFIG.THROTTLE_MS + (Math.random() * 1500);

                    console.log(`⏳ Throttling for ${sleepTime / 1000}s (Stealth Mode)...`);
                    await new Promise(r => setTimeout(r, sleepTime));

                } catch (error) {
                    // in MongoDB, filter "{ status: "failed" }" to see broken URL's
                    console.log(`❌ Error on ${handle}: ${error.message}`);
                    await queue.updateOne(
                        { _id: task._id },
                        { $set: { status: "failed", error: error.message } }
                    );
                }
            });
        });
        
        // wait for all workers to finish 
        await Promise.all(promises);

    } catch (err) {
        console.error("❌ Database Connection Error:", err.message);
    } finally {
        await client.close();
        console.log("\n🏁 Demo Batch Complete. Atlas Queue Updated.");
    }
}

runScaleTest();