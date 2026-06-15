from src.pii import PIIScrubber

def test_pii_scrubber_table():
    scrubber = PIIScrubber()
    cases = [
        ("Contact me at user@example.com", "Contact me at [EMAIL]"),
        ("Email: first.last at gmail dot com for info", "Email: [EMAIL] for info"),
        ("My number is +91 9876543210.", "My number is [PHONE]."),
        ("Call 9876543210 please.", "Call [PHONE] please."),
        ("Follow @indmoney on twitter", "Follow [HANDLE] on twitter"),
        ("No PII here!", "No PII here!"),
    ]
    for text_in, expected in cases:
        assert scrubber.scrub(text_in) == expected
