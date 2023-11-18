// Import Express.
const express = require('express');
// Import path module.
const path = require('path');
// Create new instance of express.
const app = express();
// Set post where server will listen.
const PORT = process.env.PORT || 3000;
// Setup node fetch.
const fetch = require('node-fetch');
// Set up cors.
const cors = require('cors');
// Set up environment variables.
require('dotenv').config();
// Set up middleware (json, url parsing, static asset serving, cors permissions).
app
  .use(express.json())
  .use(express.urlencoded({ extended: true }))
  .use(express.static(path.join(__dirname, 'public')))
  .use(cors({
    origin: 'https://game-bargains.onrender.com/'
  }))
// Get cheapshark API deals, generate API requests to RAWG, attach images to cheapshark data. Needs to be async due to all of the fetch requests being made. 
app.get('/deals', async (req, res) => {
  const cheapSharkUrl = 'https://www.cheapshark.com/api/1.0/deals?storeID=1&sortBy=Metacritic&desc=0&onSale=1&pageSize=3';
  try {
    const cheapSharkResponse = await fetch(cheapSharkUrl);
    const dealsData = await cheapSharkResponse.json();
    const titlesThatNeedImages = makeTitlesArray(dealsData);
    const urlsGenerated = generateRawgUrls(titlesThatNeedImages);
    const rawgImageUrls = await getRawgImageUrl(urlsGenerated)
    // console.log(rawgImageUrls);
    const dealsDataWithRawg = await addRawgToDeals(rawgImageUrls, dealsData)
    // console.log(dealsDataWithRawg);
    res.json(dealsDataWithRawg);
  } catch (error) {
    console.error('Error:', error);
    res.status(!200).send(error);
  }
});
// Test rawg response.
// app.get('/rawg', (req, res) => {
// const rawgUrl = `https://api.rawg.io/api/games?search=The%20Witcher%203%3A%20Wild%20Hunt&key=${process.env.RAWG_API_KEY}`;
// fetch(rawgUrl)
//     .then(response => response.json())
//     .then(data => {
//       res.json(data);
//     })
//     .catch(error => {
//       console.error('Error:', error);
//       res.status(!200).send(error);;
//     });
// });
// For each game on sale returned by the cheapshark API, push the title into an array.
function makeTitlesArray(data) {
  const titleArray = [];
  data.forEach(objectInArray => {
    titleArray.push(objectInArray.title);
  });
  return titleArray;
}
// For each title, generate a url that will be used to make a request to the RAWG API for that specific title. 
function generateRawgUrls(titlesThatNeedImages) {
  const rawgUrlArray = []
  titlesThatNeedImages.forEach(titleInArray => {
    const encodedTitle = encodeURIComponent(titleInArray);
    // console.log(encodedTitle);
    const rawgUrl = `https://api.rawg.io/api/games?search=${encodedTitle}&key=${process.env.RAWG_API_KEY}`;
    // console.log(rawgUrl);
    rawgUrlArray.push(rawgUrl);
  });
  return rawgUrlArray;
}
// Make multiple simultaneous fetch requests using the urls generated by generateRawgUrls. Map each url generated into an array of promises and extract image urlfrom RAWG responses. Return array of image URLs once all promises have been resolved.   
function getRawgImageUrl(urlsGenerated) {
  const fetchPromises = urlsGenerated.map(urlInArray => {
    return fetch(urlInArray)
      .then(response => response.json())
      .then(data => data.results[0].background_image)
      .catch(error => {
        console.error('Error:', error);
        return error;
      });
  });
  return Promise.all(fetchPromises);
}
// Insert RAWG image url into deals data so that the front end can use it instead of the thumb image from cheapshark.
function addRawgToDeals(rawgImageUrls, dealsData) {
  const updatedDeals = [];
  dealsData.forEach((objectInArray, index) => {
    const dealWithRawgImage = {
      ...objectInArray,
      rawgImageUrl: rawgImageUrls[index]
    };
    updatedDeals.push(dealWithRawgImage);
  });
  return updatedDeals;
}
// Set up express server.
app.listen(PORT, () => console.log(`Now listening on ${PORT}`));
