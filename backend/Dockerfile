# Use node:20-alpine as the base image for a lightweight runtime environment
FROM node:20-alpine
RUN apk add --no-cache openssl libc6-compat
# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package files for dependency installation
COPY package*.json ./

# Install project dependencies
RUN npm ci

# Copy Prisma schema definition
COPY prisma ./prisma/

# Generate Prisma Client (performed during build so types are available)
RUN npx prisma generate

# Copy the rest of the application files
COPY . .

# Set proper ownership of application directory to the non-root 'node' user
RUN chown -R node:node /usr/src/app

# Switch to the non-root 'node' user for enhanced security
USER node

# Expose the API server port
EXPOSE 8000

# Default command to run the backend server (can be overridden in docker-compose)
CMD ["npm", "run", "start"]
