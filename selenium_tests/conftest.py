import os
import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options


@pytest.fixture(scope="session")
def base_url():
    return os.getenv("SHOPSMART_URL", "http://localhost:3000")


@pytest.fixture
def driver():
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    browser = webdriver.Chrome(options=opts)
    browser.implicitly_wait(5)
    yield browser
    browser.quit()
