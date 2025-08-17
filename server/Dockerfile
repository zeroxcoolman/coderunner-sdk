# I used railway so I optimised it more
FROM node:18-alpine

# Install all system dependencies in one efficient layer
RUN apk add --no-cache \
    bash curl wget \
    gcc g++ musl-dev make \
    python3 python3-dev \
    php lua5.3 ruby openjdk11-jdk \
    && ln -sf /usr/bin/lua5.3 /usr/bin/lua \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy and install server dependencies first (better Docker caching)
COPY package*.json ./
RUN npm install --only=production --no-audit --no-fund

# Copy and build client in the same stage (faster for Railway)
COPY client ./client
WORKDIR /app/client
RUN npm install --no-audit --no-fund && npm run build

# Back to app root and copy server files
WORKDIR /app
COPY server.js ./

# Install Rust with minimal profile (faster)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable
ENV PATH="/root/.cargo/bin:${PATH}"

# Install Go with direct extraction (faster)
RUN wget -q https://go.dev/dl/go1.21.0.linux-amd64.tar.gz -O - | tar -xz -C /usr/local
ENV PATH="/usr/local/go/bin:${PATH}"

# Create required directories
RUN mkdir -p temp_files user_files backups themes logs

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV EXEC_TIMEOUT_MS=15000
ENV MAX_FILE_SIZE=1048576

# Railway sets PORT automatically
EXPOSE ${PORT:-3000}

# Simple health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the application
CMD ["node", "server.js"]
