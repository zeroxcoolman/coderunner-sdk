# Minimal Railway build - fastest option
FROM node:18-alpine

# Install system dependencies in one layer
RUN apk add --no-cache \
    bash curl wget gcc g++ musl-dev make \
    python3 php lua5.3 ruby openjdk11-jdk \
    && ln -sf /usr/bin/lua5.3 /usr/bin/lua

# Set working directory
WORKDIR /app

# Copy and install server dependencies first (better caching)
COPY package*.json ./
RUN npm install --only=production

# Copy and build client
COPY client ./client
WORKDIR /app/client
RUN npm install && npm run build

# Back to app root
WORKDIR /app

# Copy server source
COPY server.js ./

# Install optional language toolchains (these can fail gracefully)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal || echo "Rust install failed, continuing..."
ENV PATH="/root/.cargo/bin:${PATH}"

RUN wget -q https://go.dev/dl/go1.21.0.linux-amd64.tar.gz -O - | tar -xz -C /usr/local || echo "Go install failed, continuing..."
ENV PATH="/usr/local/go/bin:${PATH}"

# Create directories
RUN mkdir -p temp_files user_files backups themes logs

# Environment
ENV NODE_ENV=production HOST=0.0.0.0

# Health check
HEALTHCHECK CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start
CMD ["node", "server.js"]
