# Create a temporary context that includes both client and server
WORKDIR /build

# Copy the server code (including the client folder)
COPY . .

# Build the client
WORKDIR /build/client
RUN npm install && npm run build

# Now go back to server directory
WORKDIR /build

# Install server dependencies and build server
RUN npm install && npm run build

# Final stage: minimal runtime image
FROM node:18-alpine
WORKDIR /app
COPY --from=0 /build .
CMD ["node", "dist/index.js"]
