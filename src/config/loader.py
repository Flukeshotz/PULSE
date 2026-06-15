import yaml
from pydantic import BaseModel
from typing import Dict, List, Optional

class AppStoreConfig(BaseModel):
    enabled: bool
    app_id: str
    countries: List[str]

class PlayStoreConfig(BaseModel):
    enabled: bool
    package: str
    languages: Optional[List[str]] = ["en", "hi"]

class RedditConfig(BaseModel):
    enabled: bool
    queries: List[str]
    subreddits: List[str]

class SourcesConfig(BaseModel):
    app_store: AppStoreConfig
    play_store: PlayStoreConfig
    reddit: RedditConfig

class ProductConfig(BaseModel):
    display_name: str
    doc_title: str
    sources: SourcesConfig
    window_weeks: int
    recipients: List[str]

class RunConfig(BaseModel):
    send_email: bool
    max_tokens_per_run: int
    max_cost_usd_per_run: float
    embedding_model: str
    llm_model: str
    umap_random_state: int
    delivery_target: str
    mcp_server_url: Optional[str] = None

class Config(BaseModel):
    products: Dict[str, ProductConfig]
    run: RunConfig

def load_config(path: str = "config/products.yaml") -> Config:
    with open(path, "r") as f:
        data = yaml.safe_load(f)
    return Config(**data)
