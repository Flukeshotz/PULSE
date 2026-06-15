from src.orchestrator import Orchestrator
from src.ingestion.base import ReviewSource, SourceError

class FailingSource(ReviewSource):
    name = "failing_source"
    def fetch(self, product, w_start, w_end):
        raise SourceError("Injected failure")

class OKSource(ReviewSource):
    name = "ok_source"
    def fetch(self, product, w_start, w_end):
        return []

def test_partial_run_status():
    import os
    if os.path.exists("run_ledger.db"):
        os.remove("run_ledger.db")
    orc = Orchestrator(product="indmoney", dry_run=True)
    # Inject our mock sources
    orc.sources = [OKSource(), FailingSource()]
    
    record = orc.run()
    
    assert record.status == "partial"
    assert "ok_source" in record.sources_covered
    assert "failing_source" not in record.sources_covered
