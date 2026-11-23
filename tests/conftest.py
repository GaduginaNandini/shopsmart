import pytest

from app import create_app
from app.models import Product, db


@pytest.fixture()
def app():
    app = create_app({"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"})
    with app.app_context():
        db.session.add_all([
            Product(name="Notebook", price="50.00", stock=100),
            Product(name="Pen", price="10.00", stock=5),
        ])
        db.session.commit()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()
