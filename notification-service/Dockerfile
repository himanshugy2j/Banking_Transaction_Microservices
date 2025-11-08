# Use official Node.js runtime
FROM node:20-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./
RUN npm install


# Install dependencies (use ci for clean, reproducible installs)
RUN npm ci --omit=dev

# Copy the rest of the service code
COPY . .

# Expose the service port
EXPOSE 3003

# Start the notification service
CMD ["node", "src/index.js"]
