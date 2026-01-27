# Build stage for React frontend
FROM node:20-alpine AS frontend-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install dependencies
RUN npm install

# Copy client source
COPY client/ ./

# Build the React app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY server/package*.json ./server/

# Install server dependencies
WORKDIR /app/server
RUN npm install --production

# Copy server source
COPY server/ ./

# Copy data files
COPY data/ /app/data/

# Copy built frontend from build stage
COPY --from=frontend-build /app/client/build /app/client/build

# Set environment
ENV NODE_ENV=production
ENV PORT=5300

EXPOSE 5300

CMD ["node", "index.js"]
