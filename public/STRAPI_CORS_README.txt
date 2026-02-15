If Strapi books don't show on mobile (but work on desktop), the API might be blocking the request (CORS).

FIX IN STRAPI (your Strapi project on Render or locally):

1. In your Strapi project find: config/middlewares.js (or config/env/production/middlewares.js)
2. In the 'cors' section set origin to allow your website URL, for example:
   origin: ['https://YOUR-FRONTEND-URL.onrender.com', 'http://localhost:3000']
   Or for testing you can use: origin: true  (allows all origins)

3. Redeploy Strapi on Render after changing the config.

Your frontend URL = the address where users open the bookstore (e.g. https://mybookstore.onrender.com).
