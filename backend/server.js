const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.ATLAS_URI)
  .then(() => console.log("Connected to Fitment Parts DB"))
  .catch(err => console.error("DB Connection Error:", err));

// schema based on MongoDB entries 
const PartSchema = new mongoose.Schema({
  Years: [String], 
  Make: String,   
  Model: String,  
  Trim: String,
  productId: Number,
  handle: String,
  sku: String
}, { collection: 'fitment_data' });

const PORT = 5050; // avoid Airplay conflict 
const Part = mongoose.model('Part', PartSchema);

// fetch all years in MongoDB
app.get('/api/years', async (req, res) => {
  try {
    const years = await Part.distinct('Years'); 
    res.json(years.sort().reverse()); 
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// fetch all makes that apply to selected year 
app.get('/api/makes', async (req, res) => {
  const { year } = req.query;
  const makes = await Part.distinct('Make', { Years: year }); // find inside Years array
  res.json(makes.sort());
});

// fetch all models that apply to selected model and year 
app.get('/api/models', async (req, res) => {
  const { year, make } = req.query;
  const models = await Part.distinct('Model', { Years: year, Make: make }); // find inside years array and make selection 
  res.json(models.sort());
});

// fetch all trims that apply to selected model, make, and year
app.get('/api/trims', async (req, res) => {
  const { year, make, model } = req.query;
  const trims = await Part.distinct('Trim', { Years: year, Make: make, Model: model });
  res.json(trims.sort());
});

// count unique car fitments
app.get('/api/count', async (req, res) => {
  try {
    const { year, make, model } = req.query;
    const uniqueHandles = await Part.distinct('handle', { Years: year, Make: make, Model: model }); // different trims for same car might have same compatible parts  
    res.json({ count: uniqueHandles.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get car fitments from "queue" for selected car
app.get('/api/search-results', async (req, res) => {
  try {
    const { year, make, model, trim } = req.query;

    // car fitments 
    let matchQuery = { Years: year, Make: make, Model: model };
    
    // trim (optional) - some users don't know their cars trim
    if (trim && trim !== "") {
      matchQuery.Trim = trim;
    }

    // output: dropdown search results
    const results = await mongoose.connection.db.collection('fitment_data').aggregate([
      // look in fitment_data collection for selected car fitments 
      { $match: matchQuery },

      // find handle(fitment title) inside queue collection 
      {
        $lookup: {
          from: 'queue',
          localField: 'handle',
          foreignField: 'handle',
          as: 'productDetails'
        }
      },

      // clean data for $group below 
      { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },

      // show unique parts
      // different trims of the same car can have same fitments   
      {
        $group: {
          _id: '$handle',
          title: { $first: '$productDetails.title' },
          status: { $first: '$productDetails.status' },
          price: { $first: { $ifNull: ['$productDetails.price', 0] } },
          stock: { $first: { $ifNull: ['$productDetails.stock', 0] } },
          original_price: { $first: '$productDetails.original_price' },
          supplier_note: { $first: '$productDetails.supplier_note' }
        }
      },

      { $limit: 50 }

    ]).toArray();

    // failsafe: fill empty titles with foramtted handle 
    const formattedResults = results.map(item => ({
      ...item,
      displayTitle: item.title || item._id.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      // format simulated supplier change categories
      price: item.price,
      stock: item.stock,
      original_price: item.original_price,
      supplier_note: item.supplier_note
    }));

    res.json(formattedResults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));