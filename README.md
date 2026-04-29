# Parts Supplier Sim 

A car parts search tool featuring a simulation of live supplier price and stock updates.

![Demo of App Interaction](videos/app_demo.mp4)

---

## Table of Contents
* [Installation](#installation)
* [Deployment](#deployment)
    * [Local Deployment](#local-deployment)
* [Usage](#usage)
* [Testing the Simulation](#testing-the-supplier-simulation)

---

## Installation
1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/seanavers/parts-supplier-sim.git](https://github.com/seanavers/parts-supplier-sim.git)
    ```
2.  **Navigate to the project directory:**
    ```bash
    cd parts-supplier-sim
    ```
3.  **Install dependencies:**
    ```bash
    npm install
    ```
4.  **Create your `.env` file in the root of your project:**
    Add your MongoDB connection string and port:

    ```env
    ATLAS_URI=your_mongodb_connection_string
    PORT=5050
    ```

---

## Deployment

### Local Deployment
Navigate to the project directory in your terminal.

1.  **Frontend:**
    ```bash
    npm start
    ```

2.  **Backend:** (in a separate terminal)
    ```bash
    node server.mjs
    ```

---

## Usage
1.  **Dropdown:** Select a Year, Make, and Model (Trim is optional).
2.  **Real-Time Search:** Once selections are made, use the Search Bar to find specific compatible parts.
3.  **Stock Toggle:** Use the "In-Stock Only" toggle to filter out of stock items.
4.  **Automatic Navigation:** A "Jump to Top" button appears when scrolling past results for a quick return to the Search Bar.

---

## Testing the Supplier Simulation

1.  **Queue Updates:** Set 20 items to "pending" status to simulate an incoming supplier data feed.
    ```bash
    node -e 'const { MongoClient } = require("mongodb"); require("dotenv").config(); async function run() { const client = new MongoClient(process.env.ATLAS_URI || process.env.MONGO_URI); await client.connect(); const coll = client.db("parts-sync-db").collection("queue"); const docs = await coll.find({ status: "completed" }).limit(20).toArray(); const ids = docs.map(d => d._id); const res = await coll.updateMany({ _id: { $in: ids } }, { $set: { status: "pending" } }); console.log("✅ Success! Reset " + res.modifiedCount + " items to pending."); process.exit(); } run();'
    ```

2.  **Run Simulation Script:** 
    ```bash
    node automation/updatePriceAndStock.js

3.  **Observe UI Changes:** Modified items now display a **"Price and Stock Updated"** badge, a strike-through on it's original price, and a new (randomized) stock number.

4.  **Reset Database: Go back to original price and stock levels** 
    ```bash
    node automation/revertSimulatedChanges.js
    ```
    Then run the factory reset:
    ```bash
    node -e 'const { MongoClient } = require("mongodb"); require("dotenv").config(); async function run() { const client = new MongoClient(process.env.ATLAS_URI); await client.connect(); const coll = client.db("parts-sync-db").collection("queue"); await coll.updateMany({}, { $unset: { original_price: "", supplier_note: "" }, $set: { status: "completed" } }); console.log("🧹 Database Reset."); process.exit(); } run();'
    ```