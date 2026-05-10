# Use Node.js base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build
# Add crypto polyfill for TypeORM
RUN echo "global.crypto = require('crypto');" > dist/polyfill.js
# Expose port
EXPOSE 3030

# Start the application
CMD ["node", "-r", "./dist/polyfill.js", "dist/main.js"]
