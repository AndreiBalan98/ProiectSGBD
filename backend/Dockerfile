# Folosim imaginea Ubuntu în loc de Alpine
FROM node:18-slim

# Instalăm dependențele necesare
RUN apt-get update && apt-get install -y \
    libaio1 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Descărcăm și instalăm Oracle Instant Client
RUN mkdir -p /opt/oracle && \
    cd /tmp && \
    curl -o instantclient-basiclite.zip \
    "https://download.oracle.com/otn_software/linux/instantclient/1923000/instantclient-basiclite-linux.x64-19.23.0.0.0dbru.zip" && \
    unzip instantclient-basiclite.zip && \
    mv instantclient_19_23 /opt/oracle/instantclient && \
    rm instantclient-basiclite.zip

# Setăm variabilele de mediu pentru Oracle
ENV LD_LIBRARY_PATH=/opt/oracle/instantclient:$LD_LIBRARY_PATH
ENV PATH=/opt/oracle/instantclient:$PATH

# Creăm directorul de lucru
WORKDIR /app

# Copiem package.json și package-lock.json (dacă există)
COPY package*.json ./

# Instalăm dependențele Node.js
RUN npm install

# Copiem codul sursă
COPY . .

# Expunem portul 3000
EXPOSE 3000

# Comanda de start
CMD ["npm", "start"]