ARG NODE_VERSION=24.12.0

FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV production

WORKDIR /app

COPY package.json .
COPY client.js .
COPY index.html .
COPY favicon.ico .
RUN npm install
COPY . .

EXPOSE 8080
CMD ["node","client.js"]
