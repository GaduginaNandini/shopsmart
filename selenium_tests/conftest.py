"""Starts a live ShopSmart server on a free port + headless Chrome.
Run:  pytest selenium_tests --html=selenium_report.html   (needs requirements-dev.txt)
webdriver-manager downloads a matching chromedriver automatically."""
import os, socket, tempfile, threading, time

import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

from app import create_app


def _free_port():
    with socket.socket() as s:
        s.bind(("", 0)); return s.getsockname()[1]


@pytest.fixture(scope="session")
def base_url():
    db = os.path.join(tempfile.mkdtemp(), "e2e.db")
    app = create_app({"SQLALCHEMY_DATABASE_URI": f"sqlite:///{db}"})  # not TESTING -> demo products seeded
    port = _free_port()
    t = threading.Thread(target=lambda: app.run(port=port, use_reloader=False), daemon=True)
    t.start(); time.sleep(1)
    return f"http://127.0.0.1:{port}"


@pytest.fixture()
def driver():
    opts = Options()
    for a in ("--headless=new", "--no-sandbox", "--disable-dev-shm-usage", "--window-size=1280,900"):
        opts.add_argument(a)
    if os.getenv("CHROME_BIN"):
        opts.binary_location = os.environ["CHROME_BIN"]
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = Service(ChromeDriverManager().install())
    except Exception:
        service = Service()  # fall back to chromedriver on PATH
    d = webdriver.Chrome(service=service, options=opts)
    yield d
    d.quit()
