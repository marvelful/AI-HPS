FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Overridden per-service in docker-compose.yml
CMD ["uvicorn", "agents.main:app", "--host", "0.0.0.0", "--port", "8020"]
# FROM python:3.11-slim

# WORKDIR /app

# RUN apt-get update && \
#     apt-get install -y --no-install-recommends gcc && \
#     rm -rf /var/lib/apt/lists/*

# COPY requirements.txt .

# RUN pip install --upgrade pip

# # Install CPU-only PyTorch
# RUN pip install \
#     torch==2.3.1 \
#     --index-url https://download.pytorch.org/whl/cpu

# RUN pip install --no-cache-dir -r requirements.txt

# COPY . .

# CMD ["uvicorn", "agents.main:app", "--host", "0.0.0.0", "--port", "8020"]