from datetime import datetime
from src.models import RawRecord
from src.normalize import Normalizer

def test_dedup_normalization():
    normalizer = Normalizer()
    raw = RawRecord(
        source="app_store",
        native_id="123",
        text="This is a really great app indeed.",
        rating=5,
        created_at=datetime.utcnow(),
        locale="en-IN",
        url=None,
        meta={}
    )
    # Feed the exact same record twice
    reviews, _ = normalizer.normalize([raw, raw], "indmoney")
    
    assert len(reviews) == 1
    assert reviews[0].review_id is not None
