FROM node:18
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate --schema=prisma/schema.prisma
RUN npx prisma generate --schema=prisma/schemaBase.prisma
CMD ["node", "worker_pub.js"]