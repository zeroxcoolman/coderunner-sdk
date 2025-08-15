# tunak tunak tun
# Stage 1: Build client
FROM node:20 AS client-builder
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Build server + client
FROM node:20
WORKDIR /app

# Install system tools (gcc, python3, etc.)
RUN apt-get update && apt-get install -y python3 gcc g++

# Copy server files
COPY server/package*.json ./server/
RUN cd server && npm install
COPY server/server.js ./server/

# Copy built client
COPY --from=client-builder /app/client/dist ./server/client/dist

# Set env vars
ENV PORT=3000
ENV ALLOWED_ORIGINS="*"

# Start server
WORKDIR /app/server
CMD ["node", "server.js"]
