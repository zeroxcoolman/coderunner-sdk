# Stage 1: Build client
FROM node:20 AS client-builder
WORKDIR /app
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Build server
FROM node:20
WORKDIR /app

# Install system tools
RUN apt-get update && apt-get install -y python3 gcc g++

# Copy server files
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm install --omit=dev

# Copy built client
COPY --from=client-builder /app/client/dist ./server/client/dist

# Copy server source
COPY server/server.js ./server/

# Start server
WORKDIR /app/server
CMD ["node", "server.js"]
