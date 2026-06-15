from dataclasses import dataclass
from typing import Optional, Dict, Any, List
from datetime import datetime

@dataclass
class RawRecord:
    source: str
    native_id: str
    text: str
    rating: Optional[float]
    created_at: datetime
    locale: Optional[str]
    url: Optional[str]
    meta: Dict[str, Any]

@dataclass
class Review:
    review_id: str          # stable hash of (source, native_id)
    source: str             # "app_store" | "play_store" | "reddit"
    product: str            # "indmoney"
    text: str               # PII-scrubbed body used downstream
    rating: Optional[float] # 1-5 where applicable; None for Reddit
    created_at: datetime    # UTC
    locale: Optional[str]   # e.g. "en-IN"
    url: Optional[str]      # link back to the source item
    meta: Dict[str, Any]    # source-specific extras (upvotes, version, etc.)

@dataclass
class ThemeTrend:
    status: str             # "escalating", "improving", "emerging", "stable", "new"
    mentions_wow_pct: float # e.g. 83.0 for +83%
    priority_wow_delta: int # e.g. +15
    rating_wow_delta: float # e.g. -0.3

@dataclass
class Theme:
    name: str
    rank: int
    quotes: List[Any]
    description: str
    business_impact: str
    root_cause_hypothesis: str
    action_plan: str
    teams_impacted: List[str]
    mentions_count: int = 0
    rating_distribution: Dict[str, int] = None
    average_rating: float = 0.0
    confidence_score: float = 0.0
    confidence_components: Dict[str, float] = None
    priority_score: int = 0
    theme_id: Optional[str] = None
    trend: Optional[ThemeTrend] = None
    trend: Optional[ThemeTrend] = None

@dataclass
class PulseReport:
    product: str
    iso_week: str            # e.g. "2026-W24"
    period_label: str        # "Last 8-12 weeks (rolling)"
    generated_at: datetime
    sources_covered: List[str]
    expected_sources: List[str]
    themes: List[Theme]      # name, rank, quotes[], action_idea, helps[]
    counts: Dict[str, int]   # reviews per source, clusters, dropped quotes, filtered_short_*
    source_counts: Dict[str, int]
    rating_distribution: Dict[str, int]
    average_rating: float
    top_escalations: List[Theme] = None
    top_improvements: List[Theme] = None

@dataclass
class RunRecord:
    product: str
    iso_week: str
    started_at: datetime
    finished_at: Optional[datetime]
    sources_covered: List[str]
    doc_id: Optional[str]
    doc_heading_id: Optional[str]
    doc_deep_link: Optional[str]
    email_message_id: Optional[str]     # None if draft-only
    email_draft_id: Optional[str]
    review_counts: Dict[str, int]
    dropped_quote_count: int
    status: str                       # "ok" | "partial" | "failed"
