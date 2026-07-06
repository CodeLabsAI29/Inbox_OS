# ==========================================
# Stage 1: Development Environment (Node.js)
# ==========================================
FROM node:20-alpine AS dev

# Set working directory
WORKDIR /app

# Copy package management files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application files
COPY . .

RUN mkdir -p /app/node_modules/.vite-temp \
    && chown -R node:node /app

#USER node

# Expose Vite development port
EXPOSE 5173

# Run Vite dev server by default in dev stage
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]


# ==========================================
# Stage 2: Builder (Runs Production Build)
# ==========================================
FROM dev AS builder

# Declare build argument for backend URL injection
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Switch to root temporarily to perform build
USER root

# Build the static site
RUN npm run build


# ==========================================
# Stage 3: Production (Nginx Unprivileged)
# ==========================================
FROM nginxinc/nginx-unprivileged:alpine AS prod

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy production build assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose default non-privileged port
EXPOSE 8080

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
