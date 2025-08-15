# Stage 1: Build client from sibling directory
FROM node:20 AS client-builder

# Create a temporary context that includes both client and server
WORKDIR /build
COPY ../client ./client
WORKDIR /build/client
RUN npm install && npm run build

# Stage 2: Build server
FROM node:20
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy server files
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# Copy built client files
COPY --from=client-builder /build/client/dist ./client/dist

# Copy server source
COPY server.js ./

# Environment
ENV PORT=8080
ENV ALLOWED_ORIGINS="*"

# Start
CMD ["node", "server.js"]
