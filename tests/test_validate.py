from src.models import Review, Theme
from src.reasoning.validate import QuoteValidator
from datetime import datetime

def test_quote_validation_hallucination_and_match():
    # Setup mock reviews with scrubbed text
    reviews = [
        Review(
            review_id="test1",
            source="app_store",
            product="indmoney",
            text="The app keeps crashing when I login",
            rating=1,
            created_at=datetime.utcnow(),
            locale="en-IN",
            url=None,
            meta={}
        ),
        Review(
            review_id="test2",
            source="app_store",
            product="indmoney",
            text="My number [PHONE] was blocked",
            rating=1,
            created_at=datetime.utcnow(),
            locale="en-IN",
            url=None,
            meta={}
        )
    ]
    
    # Theme with 1 perfect match, 1 PII scrubbed match, and 1 complete hallucination
    theme = Theme(
        name="Login and Block Issues",
        rank=1,
        quotes=[
            "The app keeps crashing when I login", # Match
            "My number [PHONE] was blocked",       # Match (against scrubbed text)
            "This app stole my dog"                # Hallucination
        ],
        action_idea="Fix crash",
        helps=["Users"]
    )
    
    validator = QuoteValidator()
    validated_theme = validator.validate_theme(theme, reviews)
    
    # We expect 2 matches and 1 drop
    assert len(validated_theme.quotes) == 2
    assert "The app keeps crashing when I login" in validated_theme.quotes
    assert "My number [PHONE] was blocked" in validated_theme.quotes
    assert "This app stole my dog" not in validated_theme.quotes
    assert validator.dropped_quotes == 1
