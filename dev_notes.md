Workflow 
1. factory reset categories (remove original price, supplier note and set all "pending" to "completed")
`node -e 'const { MongoClient } = require("mongodb"); require("dotenv").config(); async function run() { const client = new MongoClient(process.env.ATLAS_URI); await client.connect(); const coll = client.db("parts-sync-db").collection("queue"); const res = await coll.updateMany({}, { $unset: { original_price: "", supplier_note: "" }, $set: { status: "completed", stock: 0 } }); console.log("🧹 DATABASE CLEAN: Stock reset to 0, Notes/Backups wiped."); process.exit(); } run();'`
<!-- Atlas Confirm: all categories removed
{ original_price: { $exists: true } }
{ supplier_note: "supplier price changed" }
{ status: "pending" }
-->

2. Set 20 items to pending
`node -e 'const { MongoClient } = require("mongodb"); require("dotenv").config(); async function run() { const client = new MongoClient(process.env.ATLAS_URI || process.env.MONGO_URI); await client.connect(); const coll = client.db("parts-sync-db").collection("queue"); const docs = await coll.find({ status: "completed" }).limit(20).toArray(); const ids = docs.map(d => d._id); const res = await coll.updateMany({ _id: { $in: ids } }, { $set: { status: "pending" } }); console.log("✅ Success! Reset " + res.modifiedCount + " items to pending."); process.exit(); } run();'`
<!-- Atlas Confirm: items set to "pending" 
{ status: "pending" }
 -->

3. Fetch site data for pending items and store original prices 
`node scraper/pushMetadata.js` 
<!-- Atlas Confirm: "original_price" category created 
{ original_price: { $exists: true } }
 -->

4. Simulate randomized supplier price and stock to modified items 
`node automation/updatePriceAndStock.js`
<!-- Atlas Confirm:
{ original_price: { $exists: true } }
to compare price/stock of modified items  
 -->
5. Revert hiked prices and stock to original price
`node automation/revertSimulatedChanges.js`
<!-- Atlas Confirm:
{ original_price: { $exists: true } }
to compare price/stock of unmodified items 
 -->

6. rereun factory reset command to return to original data state
`node -e 'const { MongoClient } = require("mongodb"); require("dotenv").config(); async function run() { const client = new MongoClient(process.env.ATLAS_URI); await client.connect(); const coll = client.db("parts-sync-db").collection("queue"); const res = await coll.updateMany({}, { $unset: { original_price: "", supplier_note: "" }, $set: { status: "completed", stock: 0 } }); console.log("🧹 DATABASE CLEAN: Stock reset to 0, Notes/Backups wiped."); process.exit(); } run();'`
<!-- Atlas Confirm: all categories removed
{ original_price: { $exists: true } }
{ supplier_note: "supplier price changed" }
{ status: "pending" }
-->