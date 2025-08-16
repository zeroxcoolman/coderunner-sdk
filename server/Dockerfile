# Stage 1: Build
FROM node:18 AS builder

# Create a temporary context that includes both client and server
WORKDIR /build

# Copy the server code (including the client folder)
COPY . .

# Build the client
WORKDIR /build/client
RUN npm install && npm run build

# Stage 2: Runtime with compilers
FROM node:18

# Install system dependencies and compilers
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3 \
    python3-pip \
    rustc \
    golang-go \
    php \
    lua5.3 \
    ruby \
    bash \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create symbolic link for lua if needed
RUN ln -sf /usr/bin/lua5.3 /usr/bin/lua

WORKDIR /app

# Copy the built application from builder stage
COPY --from=builder /build .

# Install server dependencies (in case they weren't copied properly)
RUN npm install --production

# Create necessary directories
RUN mkdir -p temp_files user_files

# Expose port
EXPOSE 3000

CMD ["node", "server.js"]
