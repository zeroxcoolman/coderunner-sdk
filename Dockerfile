# TUNAK TUNAK TUN
# Stage 1: Build the frontend (client)
FROM node:20 AS client-builder
WORKDIR /app

# Copy client files and install dependencies
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm install

# Build the client (outputs to /app/client/dist)
COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Prepare the backend (server)
FROM node:20
WORKDIR /app

# Install system dependencies (compilers for C/Python/etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy server dependencies and install
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm install --omit=dev  # Fixes npm warning

# Copy built client from Stage 1
COPY --from=client-builder /app/client/dist ./server/client/dist

# Copy server source code
COPY server/server.js ./server/

# Set environment variables
ENV PORT=8080
ENV ALLOWED_ORIGINS="*"

# Start the server
WORKDIR /app/server
CMD ["node", "server.js"]
