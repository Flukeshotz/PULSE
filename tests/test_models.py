from datetime import datetime
from src.models import Review

def test_review_schema_conformance():
    rev = Review(
        review_id="hash",
        source="reddit",
        product="indmoney",
        text="Scrubbed text",
        rating=None,
        created_at=datetime.utcnow(),
        locale=None,
        url="http://reddit.com",
        meta={}
    )
    assert rev.source == "reddit"
    assert rev.rating is None
    assert rev.product == "indmoney"
