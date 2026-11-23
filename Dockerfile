FROM python:3.11-slim
WORKDIR /srv
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./app
COPY wsgi.py .
EXPOSE 8000
# One process (threads for concurrency): /metrics counters are in-process, so >1 worker would split them.
CMD ["gunicorn", "--workers", "1", "--threads", "8", "-b", "0.0.0.0:8000", "wsgi:app"]
