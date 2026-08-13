FROM node:20-alpine AS deps
WORKDIR /app
COPY services/api/package.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS build
WORKDIR /app
COPY services/api/package.json ./
RUN npm install
COPY services/api/ ./
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY services/api/package.json ./
EXPOSE 3001
CMD ["node", "dist/main.js"]
