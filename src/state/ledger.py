import sqlite3
import json
from typing import Optional
from datetime import datetime
from src.models import RunRecord

class RunLedger:
    def __init__(self, db_path: str = "run_ledger.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS runs (
                    product TEXT,
                    iso_week TEXT,
                    started_at TEXT,
                    finished_at TEXT,
                    sources_covered TEXT,
                    doc_id TEXT,
                    doc_heading_id TEXT,
                    doc_deep_link TEXT,
                    email_message_id TEXT,
                    email_draft_id TEXT,
                    review_counts TEXT,
                    dropped_quote_count INTEGER,
                    status TEXT,
                    PRIMARY KEY (product, iso_week)
                )
            """)

    def get_run(self, product: str, iso_week: str) -> Optional[RunRecord]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute(
                "SELECT * FROM runs WHERE product = ? AND iso_week = ?", 
                (product, iso_week)
            ).fetchone()
            
            if not row:
                return None
                
            return RunRecord(
                product=row["product"],
                iso_week=row["iso_week"],
                started_at=datetime.fromisoformat(row["started_at"]),
                finished_at=datetime.fromisoformat(row["finished_at"]) if row["finished_at"] else None,
                sources_covered=json.loads(row["sources_covered"]),
                doc_id=row["doc_id"],
                doc_heading_id=row["doc_heading_id"],
                doc_deep_link=row["doc_deep_link"],
                email_message_id=row["email_message_id"],
                email_draft_id=row["email_draft_id"],
                review_counts=json.loads(row["review_counts"]),
                dropped_quote_count=row["dropped_quote_count"],
                status=row["status"]
            )

    def upsert_run(self, record: RunRecord):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                INSERT OR REPLACE INTO runs (
                    product, iso_week, started_at, finished_at, sources_covered,
                    doc_id, doc_heading_id, doc_deep_link, email_message_id,
                    email_draft_id, review_counts, dropped_quote_count, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                record.product,
                record.iso_week,
                record.started_at.isoformat(),
                record.finished_at.isoformat() if record.finished_at else None,
                json.dumps(record.sources_covered),
                record.doc_id,
                record.doc_heading_id,
                record.doc_deep_link,
                record.email_message_id,
                record.email_draft_id,
                json.dumps(record.review_counts),
                record.dropped_quote_count,
                record.status
            ))
