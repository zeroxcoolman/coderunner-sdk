# Stage 1: Build client directly from sibling dir
FROM node:20 AS client-builder
WORKDIR /app

# Hack: Copy client files by temporarily moving to parent dir
WORKDIR /app_parent  # One level up
COPY ./client ./client  # Now paths are relative to project root
WORKDIR /app_parent/client
RUN npm install && npm run build  # Builds to /app_parent/client/dist

# Stage 2: Build server
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
RUN npm install --omit=dev

# Copy built client from Stage 1
COPY --from=client-builder /app_parent/client/dist ./client/dist

# Copy server source
COPY server.js ./

# Set env vars
ENV PORT=8080
ENV ALLOWED_ORIGINS="*"

# Start server
CMD ["node", "server.js"]
