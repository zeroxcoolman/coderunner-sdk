# Stage 1: Build the client
FROM node:20 AS client-builder
WORKDIR /app
COPY ../client/package*.json ./client/
RUN cd client && npm install
COPY ../client/ ./client/
RUN cd client && npm run build  # Outputs to /app/client/dist

# Stage 2: Run the server + client
FROM node:20
WORKDIR /app

# Install system dependencies (compilers for C/Python/Rust/etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy server files
COPY package*.json ./
RUN npm install
COPY server.js ./

# Copy built client from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Set environment variables
ENV PORT=3000
ENV ALLOWED_ORIGINS="*"

# Start the server
CMD ["node", "server.js"]
