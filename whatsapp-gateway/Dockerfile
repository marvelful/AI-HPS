FROM openwa/wa-automate

ENTRYPOINT []

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src

ENV NODE_ENV=production
CMD ["npm", "start"]
