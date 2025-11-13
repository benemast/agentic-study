# Dockerfile Frontend
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Declare all build args that compose passes
ARG VITE_API_BASE
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT
ARG VITE_CONTACT_NAME
ARG VITE_CONTACT_EMAIL
ARG VITE_ENABLE_CLARITY
ARG VITE_CLARITY_PROJECT_ID
ARG VITE_DEBUG
ARG VITE_SESSION_TIMEOUT

# 2) Promote them to ENV so Vite can see them as import.meta.env.VITE_*
ENV VITE_API_BASE=${VITE_API_BASE}
ENV VITE_SENTRY_DSN=${VITE_SENTRY_DSN}
ENV VITE_SENTRY_ENVIRONMENT=${VITE_SENTRY_ENVIRONMENT}
ENV VITE_CONTACT_NAME=${VITE_CONTACT_NAME}
ENV VITE_CONTACT_EMAIL=${VITE_CONTACT_EMAIL}
ENV VITE_ENABLE_CLARITY=${VITE_ENABLE_CLARITY}
ENV VITE_CLARITY_PROJECT_ID=${VITE_CLARITY_PROJECT_ID}
ENV VITE_DEBUG=${VITE_DEBUG}
ENV VITE_SESSION_TIMEOUT=${VITE_SESSION_TIMEOUT}
ENV VITE_API_URL=${VITE_API_BASE}
ENV VITE_API_BASE_URL=${VITE_API_BASE}/api/api

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create log directory
RUN mkdir -p /var/log/nginx && \
    touch /var/log/nginx/access.log && \
    touch /var/log/nginx/error.log

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]