// Revert simulated supplier change 

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

async function revertSimulatedChanges() {
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection("queue");

    // check which data has "supplier_note" category 
    const query = { supplier_note: "supplier price changed" };
    const count = await collection.countDocuments(query);

    if (count === 0) {
      console.log("✨ No simulated data found. Database is already clean!");
      return;
    }

    // revert simulated supplier change 
    const result = await collection.updateMany(
      query,
      [
        {
          $set: {
            price: "$original_price", // stored price
            stock: 0, // original stock 
            last_synced: new Date()
          }
        },
        {
          $unset: "supplier_note" // remove category 
        }
      ]
    );

    console.log(`\n✅ Success!`);
    console.log(`🗑️ Removed "supplier_note" and reset prices for ${result.modifiedCount} documents.`);

  } catch (err) {
    console.error("❌ Revert failed:", err);
  } finally {
    await client.close();
    process.exit(0);
  }
}

revertSimulatedChanges();