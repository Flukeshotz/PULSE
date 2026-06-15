from typing import Protocol, List
from datetime import date
from src.models import RawRecord
from src.config.loader import ProductConfig

class SourceError(Exception):
    """Raised when an ingestion source fails to fetch data."""
    pass

class ReviewSource(Protocol):
    name: str

    def fetch(
        self,
        product: ProductConfig,
        window_start: date,
        window_end: date,
    ) -> List[RawRecord]:
        """Fetch raw records within the specified date window."""
        ...
