FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build 

# Add crypto polyfill for TypeORM
RUN echo "global.crypto = require('crypto');" > dist/polyfill.js

EXPOSE 3013:3003

CMD ["node", "-r", "./dist/polyfill.js", "dist/main.js"]
