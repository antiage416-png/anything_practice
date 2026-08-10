# Multi-stage Dockerfile for Quant Trading System Architecture Platform
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Install Python quant packages
RUN pip install --no-cache-dir \
    numpy \
    pandas \
    requests \
    websockets \
    urllib3

# Copy application files
COPY quant_engine.py /app/
COPY index.html /app/
COPY styles.css /app/
COPY app.js /app/
COPY README.md /app/

# Configure Supervisor process manager to run both Quant Core & Web Dashboard UI
RUN echo '[supervisord]\n\
nodaemon=true\n\
\n\
[program:quant_engine]\n\
command=python /app/quant_engine.py\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n\
\n\
[program:web_dashboard]\n\
command=python -m http.server 8080 --directory /app\n\
autostart=true\n\
autorestart=true\n\
stdout_logfile=/dev/stdout\n\
stdout_logfile_maxbytes=0\n\
stderr_logfile=/dev/stderr\n\
stderr_logfile_maxbytes=0\n' > /etc/supervisor/conf.d/supervisord.conf

# Expose Web Dashboard Port
EXPOSE 8080

# Run supervisor as container entrypoint
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
