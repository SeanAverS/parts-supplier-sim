// Randomly update price and stock to simulate supplier change 

const path = require('path');
const { MongoClient } = require("mongodb");
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const uri = process.env.ATLAS_URI;
const dbName = uri.split('/').pop().split('?')[0] || "parts-sync-db";
const client = new MongoClient(uri);

if (!uri) {
  console.error("❌ Error: ATLAS_URI is not defined in .env");
  process.exit(1);
}

 async function updatePriceAndStock() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("queue");

    console.log(`Connected to ${dbName}. Selecting 20 random items...`);

    // get items with price and orignal price(backup) from MongoDB 
    const randomItems = await collection.aggregate([
      {
        $match: {
          original_price: { $exists: true }, 
          status: "completed"          
        }
      },
      { $sample: { size: 20 } }
    ]).toArray();

    if (randomItems.length === 0) {
      console.log("⚠️ No items with prices found to update.");
      return;
    }

    // prepare updates
    const operations = randomItems.map(item => {
      const newPrice = parseFloat((Math.random() * (1500 - 100) + 100).toFixed(2)); // between $100 and $1500
      const newStock = Math.floor(Math.random() * 20) + 1; // between 1 and 20(inclusive) 

      return {
        updateOne: {
          filter: { _id: item._id },
          update: {
            $set: {
              price: newPrice,
              stock: newStock,
              last_synced: new Date(),
              supplier_note: "supplier price changed"
            }
          }
        }
      };
    });

    // run updates
    const result = await collection.bulkWrite(operations);

    console.log(`\n✅ Update Complete!`);
    console.log(`🔄 Successfully updated ${result.modifiedCount} random items.`);
    console.log(`📝 Added note: "supplier price changed" to these documents.`);

  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

updatePriceAndStock();