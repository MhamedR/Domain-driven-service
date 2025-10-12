# Use Node.js 22.20.0 Alpine image
FROM node:22.20.0-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Install serve to run the application
RUN npm install -g serve

# Expose port
EXPOSE 4200

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:4200 || exit 1

# Start the application
CMD ["serve", "-s", "dist/domain-driven-frontend", "-l", "4200"]
