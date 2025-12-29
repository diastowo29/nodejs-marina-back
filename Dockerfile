FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma
CMD ["node", "worker.js"]


# # 1. Use a light version of Node.js
# FROM node:20-alpine
# # 2. Create an app directory inside the container
# WORKDIR /app
# # WORKDIR /usr/src/app
# # 3. Copy your package files and install dependencies
# COPY package*.json ./
# RUN npm install --production
# # 4. Copy the rest of your code
# COPY . .
# RUN npm run prisma
# RUN npm run prisma:base
# # RUN npx prisma generate --schema=prisma/schemaBase.prisma
# # 5. The port your app uses (Cloud Run usually expects 8080)
# ENV PORT=3002
# # 6. Start the app
# # CMD ["node", "app.js"]
# CMD npm start