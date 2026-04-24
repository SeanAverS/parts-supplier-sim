import React, { useState, useEffect } from 'react';

const VehicleDropdown = () => {
  // dropdown states
  const [years, setYears] = useState([]); 
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);
  const [selection, setSelection] = useState({ year: '', make: '', model: '', trim: '' }); // complete result 
  // eslint-disable-next-line no-unused-vars
  const [partCount, setPartCount] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inStockToggle, setInStockToggle] = useState(false);

  // match fitments(fitment_data) with parts (queue) 
  // resets data on new selection
  const [results, setResults] = useState([]); 

  // initial load 
  useEffect(() => {
    fetch('http://localhost:5050/api/years')
      .then(res => res.json())
      .then(data => setYears(data))
      .catch(err => console.error("Error fetching years:", err));
  }, []);

  // get years 
  useEffect(() => {
    if (selection.year) {
      fetch(`http://localhost:5050/api/makes?year=${selection.year}`)
        .then(res => res.json())
        .then(data => {
          setMakes(data);
          setSelection(prev => ({ ...prev, make: '', model: '', trim: '' }));
          setPartCount(null); 
          setResults([]);
        });
    }
  }, [selection.year]);

  // get makes from selected year
  useEffect(() => {
    if (selection.make) {
      fetch(`http://localhost:5050/api/models?year=${selection.year}&make=${selection.make}`)
        .then(res => res.json())
        .then(data => {
          setModels(data);
          setSelection(prev => ({ ...prev, model: '', trim: '' }));
          setPartCount(null); 
          setResults([]);
        });
    }
  }, [selection.make, selection.year]);

  // get parts when selection complete (year, make, and model)
  // get trims for selection (not required for results)
  useEffect(() => {
    if (selection.model) {
      setResults([]);

      // get parts for selection 
      fetch(`http://localhost:5050/api/count?year=${selection.year}&make=${selection.make}&model=${selection.model}`)
        .then(res => res.json())
        .then(data => setPartCount(data.count))
        .catch(err => console.error("Error fetching count:", err));

      // get trims for selection 
      fetch(`http://localhost:5050/api/trims?year=${selection.year}&make=${selection.make}&model=${selection.model}`)
        .then(res => res.json())
        .then(data => setTrims(data))
        .catch(err => console.error("Error fetching trims:", err));
    }
  }, [selection.model, selection.make, selection.year]);

// auto-refresh results when trim changes for selection  
useEffect(() => {
  const { year, make, model, trim } = selection;

  if (year && make && model) {
    setIsLoading(true);

    const fetchPromise = fetch(
      `http://localhost:5050/api/search-results?year=${year}&make=${make}&model=${model}&trim=${trim}`
    ).then(res => res.json());

    const timerPromise = new Promise(resolve => setTimeout(resolve, 500));

    Promise.all([fetchPromise, timerPromise])
      .then(([data]) => {
        setResults(data);
        setIsLoading(false); 
      })
      .catch(err => {
        console.error("Auto-fetch Error:", err);
        setIsLoading(false);
      });
  } else {
    setResults([]);
    setIsLoading(false);
  }
}, [selection.year, selection.make, selection.model, selection.trim, selection]);

// count fitments based on toggle state
const stockCount = results.filter(product => {
  if (inStockToggle) { // in stock fitments
    return product.stock > 0;
  } else { // all fitments 
    return true;
  }
});

  // Dropdowns and List output
  return (
    <div className="p-8 w-[500px] mx-auto bg-white rounded-xl shadow-md space-y-4 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800">Vehicle Parts Finder</h2>

     {/* Year Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Year</label>
        <select
          value={selection.year} 
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
          onChange={(e) => setSelection({ ...selection, year: e.target.value })}
        >
          <option value="">Select Year</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Make Dropdown */}
      <div className={!selection.year ? "opacity-50 pointer-events-none" : ""}>
        <label className="block text-sm font-medium text-gray-700">Make</label>
        <select
          value={selection.make} 
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
          onChange={(e) => setSelection({ ...selection, make: e.target.value })}
        >
          <option value="">Select Make</option>
          {makes.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Model Dropdown */}
      <div className={!selection.make ? "opacity-50 pointer-events-none" : ""}>
        <label className="block text-sm font-medium text-gray-700">Model</label>
        <select
          value={selection.model}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
          onChange={(e) => setSelection({ ...selection, model: e.target.value })}
        >
          <option value="">Select Model</option>
          {models.map(mod => <option key={mod} value={mod}>{mod}</option>)}
        </select>
      </div>

      {/* Trim Dropdown */}
      <div className={!selection.model ? "opacity-50 pointer-events-none" : ""}>
        <label className="block text-sm font-medium text-gray-700">Trim (Optional)</label>
        <select
          value={selection.trim}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
          onChange={(e) => setSelection({ ...selection, trim: e.target.value })}
        >
          <option value="">All Trims</option>
          {trims.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* List Output */}
      <div className="mt-8 border-t pt-6 min-h-[300px]">
        {isLoading ? (
          /* Loading Spinner */
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          /* Results List */
            <>
              {results.length > 0 && (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                      Found {stockCount.length} compatible {stockCount.length === 1 ? 'part' : 'parts'}:
                    </h3>
                  {/* In Stock Toggle */}
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={inStockToggle}
                        onChange={(e) => setInStockToggle(e.target.checked)}
                      />
                      <div className={`
                    relative w-8 h-4 rounded-full transition-all bg-gray-200 peer-checked:bg-green-600
                    after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                    after:h-3 after:w-3 after:rounded-full after:bg-white after:border after:border-gray-300
                    after:transition-all peer-checked:after:translate-x-4
                    peer-checked:after:border-white
                    `}></div>
                      <span className="ml-2 text-[11px] font-bold text-gray-500 uppercase">In-Stock Only</span>
                    </label>
                  </div>

                  {stockCount
                    .map((product) => (
                      <div key={product._id} className="p-3 bg-white border border-gray-200 rounded shadow-sm">

                      <div className="flex justify-between items-start"> 
                        <a
                          href={`https://off-road.ca/products/${product._id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-bold text-blue-600 hover:underline"
                        >
                          {product.displayTitle}
                        </a>

                        {/* Signal supplier change */}
                        {product.supplier_note && (
                          <span className="text-[10px] bg-amber-200 text-amber-800 py-1 font-bold uppercase text-center">
                            Price and Stock Updated
                          </span>
                        )}
                      </div>

                      {/* Price and Stock Container */}
                      <div className="mt-3 flex justify-between items-end">
                        <div>
                          <div className="text-xs text-gray-500 uppercase font-bold tracking-widest mb-1">Price</div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-gray-900">
                              ${product.price ? product.price.toFixed(2) : "0.00"}
                            </span>

                            {/* Show original price for simulated supplier change */}
                            {product.original_price && product.price !== product.original_price && (
                              <span className="text-sm line-through text-gray-400">
                                ${product.original_price.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stock */}
                        <div className="text-right">
                          <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Status</div>
                          <span className={`text-xs font-bold ${product.stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {product.stock > 0 ? `${product.stock} IN STOCK` : 'OUT OF STOCK'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default VehicleDropdown;