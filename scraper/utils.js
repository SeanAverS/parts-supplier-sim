// Hub with functions that: 
// 1. filter out certain metadata  
// 2. deal with unique supplier formatting 
// only import necessary functions to files
// dont forget to add functions to module.exports below 

// global scraper settings
const SCRAPER_CONFIG = {
    CONCURRENCY: 3, // number of workers
    THROTTLE_MS: 3000, // stealth delay
    BATCH_SIZE: 1000, // items pulled from MongoDB at once
    SEED_LIMIT: 1000, 
    USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

// 1st section: functions that filter out certain metadata 

// get car fitments 
function parseFitmentTags(tagString) {
  const masterFitmentList = [];
  
  // extract for car fitments from raw tags
  const fitmentGroups = tagString.split(', ').filter(tag => tag.startsWith('fits_'));
  // console.log("📍 ONLY FITMENT TAGS:", fitmentGroups);
  
  fitmentGroups.forEach(group => {
    const individualCars = group.split('~');

    individualCars.forEach(car => {
      if (!car || !car.includes('`')) return;

      // remove "fits_" and split by backtick 
      const parts = car.replace('fits_', '').split('`');

      // multiple years for same model stored in array (saves space)
      const yearRange = parts[0];
      let yearArray = [];

      if (yearRange.includes('-')) {
        const [start, end] = yearRange.split('-').map(Number);
        for (let y = start; y <= end; y++) {
          yearArray.push(y.toString());
        }
      } else {
        yearArray.push(yearRange);
      }

      masterFitmentList.push({
        Years: yearArray,
        Make: parts[1],
        Model: parts[2],
        Trim: parts[3] || 'Base'
      });
    });
  });

  return masterFitmentList;
}

// end 1st section 


// 2nd section: functions that deal with unique supplier formatting 

// end 2nd section 

module.exports = { parseFitmentTags, SCRAPER_CONFIG };