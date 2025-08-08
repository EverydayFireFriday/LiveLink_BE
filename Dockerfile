#------------------- Builder Stage -------------------#
# Using a specific version of Node.js for reproducibility
FROM node:18-alpine AS builder

# Set the working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies using npm ci for faster, more reliable builds
# and --omit=dev to exclude development dependencies
RUN npm ci --omit=dev

# Copy the rest of the application source code
COPY . .

# Build the TypeScript source code
RUN npm run build

#------------------- Production Stage -------------------#
# Use a slim, secure base image for the final stage
FROM node:18-alpine

# Set NODE_ENV to production
ENV NODE_ENV=production

# Set the working directory
WORKDIR /usr/src/app

# Create a non-root user and group for security
# -S: create a system user
# -G: add user to a group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy dependencies and built application from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY package.json .

# Create and set permissions for the logs directory
# The appuser needs to be able to write logs
RUN mkdir -p logs && chown -R appuser:appgroup logs

# Switch to the non-root user
USER appuser

# Expose the port the app runs on
EXPOSE 3000

# The command to run the application
CMD ["node", "dist/app.js"]