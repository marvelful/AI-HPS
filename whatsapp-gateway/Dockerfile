FROM openwa/wa-automate

ENTRYPOINT []

WORKDIR /app

USER root
RUN rm -f /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends procps \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
RUN node -e "const fs=require('fs'); const file='node_modules/@open-wa/wa-automate/dist/controllers/initializer.js'; let s=fs.readFileSync(file,'utf8'); s=s.replace(\"waPage.waitForFunction('window.Debug!=undefined && window.Debug.VERSION!=undefined && require');\", \"waPage.waitForFunction('window.Debug!=undefined && window.Debug.VERSION!=undefined && require', { timeout: 120000 });\"); fs.writeFileSync(file,s);"

COPY src ./src
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
