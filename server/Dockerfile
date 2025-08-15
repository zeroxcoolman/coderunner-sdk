# Stage 1: Build the client (from parent dir)
FROM node:20 AS client-builder
WORKDIR /app
COPY ../client/package.json ../client/package-lock.json ./client/
RUN cd client && npm install
COPY ../client/ ./client/
RUN cd client && npm run build  # Outputs to /app/client/dist

# Stage 2: Build the server
FROM node:20
WORKDIR /app

# Install system tools (gcc, python3, etc.)
RUN apt-get update && apt-get install -y \
    python3 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy server files
COPY package.json package-lock.json ./
RUN npm install --omit=dev  # Fixes npm warning

# Copy built client from Stage 1
COPY --from=client-builder /app/client/dist ./client/dist

# Copy server source
COPY server.js ./

# Set env vars
ENV PORT=8080
ENV ALLOWED_ORIGINS="*"

# Start the server
CMD ["node", "server.js"]
