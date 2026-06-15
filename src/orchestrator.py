from datetime import datetime, date, timedelta
from src.config.loader import load_config
from src.delivery.mcp_client import MCPClientManager
from src.state.ledger import RunLedger
from src.models import RunRecord
from src.ingestion.base import SourceError
from src.ingestion.app_store import AppStoreSource
from src.ingestion.play_store import PlayStoreSource
from src.ingestion.reddit import RedditSource
from src.normalize import Normalizer
from src.reasoning.cluster import Clusterer
from src.reasoning.dedupe import ThemeDeduplicator
from src.reasoning.summarize import Summarizer
from src.reasoning.validate import QuoteValidator
from src.render.builder import ReportBuilder
from src.models import PulseReport, RunRecord
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

class Orchestrator:
    def __init__(self, product: str, dry_run: bool = False, send_email: bool = False, target_week: str | None = None):
        self.config = load_config()
        if product not in self.config.products:
            raise ValueError(f"Product {product} not found in config")
        
        self.product_name = product
        self.product_config = self.config.products[product]
        self.run_config = self.config.run
        self.dry_run = dry_run
        self.send_email = send_email or self.run_config.send_email
        
        if target_week:
            self.iso_week = target_week
            # Rough conversion back to a date for window calc
            year = int(target_week[:4])
            week = int(target_week[-2:])
            target_date = date.fromisocalendar(year, week, 1)
        else:
            year, week, _ = date.today().isocalendar()
            self.iso_week = f"{year}-W{week:02d}"
            target_date = date.today()
            
        self.anchor = f"{self.product_name}-{self.iso_week}"
        self.ledger = RunLedger()
        self.mcp = MCPClientManager(
            delivery_target=self.run_config.delivery_target,
            server_url=self.run_config.mcp_server_url
        )
        
        self.window_end = target_date
        self.window_start = target_date - timedelta(weeks=self.product_config.window_weeks)
        
        self.sources = [AppStoreSource(), PlayStoreSource(), RedditSource()]
        self.normalizer = Normalizer()
        self.clusterer = Clusterer()
        self.deduplicator = ThemeDeduplicator()
        self.summarizer = Summarizer()
        self.validator = QuoteValidator()

    async def run(self) -> RunRecord:
        logger.info(f"Starting pulse run for {self.product_name} (Week: {self.iso_week})")
        
        # 0. Check idempotency (bypassed for regeneration)
        existing_run = self.ledger.get_run(self.product_name, self.iso_week)
        # if existing_run and existing_run.status == "ok":
        #     logger.info(f"Run for {self.product_name} {self.iso_week} already completed successfully. Exiting.")
        #     return existing_run
            
        started_at = datetime.utcnow()
        logger.info(f"Window: {self.window_start} to {self.window_end}")
        
        record = RunRecord(
            product=self.product_name,
            iso_week=self.iso_week,
            started_at=started_at,
            finished_at=None,
            sources_covered=[],
            doc_id=None,
            doc_heading_id=None,
            doc_deep_link=None,
            email_message_id=None,
            email_draft_id=None,
            review_counts={},
            dropped_quote_count=0,
            status="running"
        )
        
        # Phase 1: Ingestion
        all_raw_records = []
        partial_run = False
        expected_sources = []
        
        for source in self.sources:
            source_config = getattr(self.product_config.sources, source.name, None)
            if source_config and not source_config.enabled:
                continue
                
            expected_sources.append(source.name)
            logger.info(f"Fetching from {source.name}...")
            try:
                raw_records = source.fetch(self.product_config, self.window_start, self.window_end)
                all_raw_records.extend(raw_records)
                record.sources_covered.append(source.name)
                record.review_counts[source.name] = len(raw_records)
                logger.info(f"  {source.name} returned {len(raw_records)} records")
            except SourceError as e:
                logger.error(f"  {source.name} failed: {e}")
                partial_run = True
            except Exception as e:
                logger.error(f"  {source.name} unexpected error: {e}")
                partial_run = True
                
        # Normalization
        reviews, short_stats = self.normalizer.normalize(all_raw_records, self.product_name)
        logger.info(f"Normalized into {len(reviews)} clean reviews")
        
        # Save cleaned reviews locally, omitting raw_text (PII)
        import json
        import os
        os.makedirs("outbox", exist_ok=True)
        outbox_path = f"outbox/{self.product_name}_cleaned_reviews.jsonl"
        with open(outbox_path, "w") as f:
            for r in reviews:
                # Omit raw_text for privacy
                d = {
                    "review_id": r.review_id,
                    "source": r.source,
                    "product": r.product,
                    "text": r.text,
                    "rating": r.rating,
                    "created_at": r.created_at.isoformat(),
                    "locale": r.locale,
                    "url": r.url,
                    "meta": r.meta
                }
                f.write(json.dumps(d) + "\n")
        logger.info(f"Saved {len(reviews)} cleaned reviews to {outbox_path}")
        
        if len(reviews) == 0:
            logger.info("No reviews found in this window.")
            themes = []
            rating_dist = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
            avg_rating = 0.0
        else:
            # Calculate rating distribution and average rating
            rating_dist = {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
            total_stars = 0
            rating_count = 0
            for r in reviews:
                if r.rating is not None:
                    key = str(int(r.rating))
                    if key in rating_dist:
                        rating_dist[key] += 1
                    total_stars += r.rating
                    rating_count += 1
            avg_rating = total_stars / rating_count if rating_count > 0 else 0.0
            
            # Phase 2: Reasoning (Clustering + Summarization)
            logger.info("Clustering reviews...")
            clusters = self.clusterer.cluster(reviews)
            logger.info(f"Formed {len(clusters)} clusters")
            
            # Check cost ceiling (Estimate)
            # Roughly max 2000 output tokens + 2500 input tokens per cluster = 4500 tokens
            estimated_tokens = len(clusters[:5]) * 4500
            max_cost = getattr(self.run_config, 'max_cost_usd_per_run', 1.50)
            # Llama3-70b is ~$0.59 / 1M tokens. Let's use $1 / 1M tokens as conservative boundary
            estimated_cost = (estimated_tokens / 1_000_000) * 1.0
            if estimated_cost > max_cost:
                logger.error(f"Cost ceiling breached! Estimated cost ${estimated_cost:.2f} > Max ${max_cost:.2f}")
                raise RuntimeError("Cost ceiling breached before summarization.")
                
            themes = []
            top_k = min(getattr(self.run_config, 'top_themes', 3), len(clusters))
            for i, cluster in enumerate(clusters[:top_k]):
                logger.info(f"Summarizing Theme {i+1} (Size: {len(cluster)})")
                theme = self.summarizer.summarize_cluster(cluster, rank=i+1)
                if theme:
                    theme = self.validator.validate_theme(theme, cluster)
                    themes.append(theme)
            
            record.dropped_quote_count = self.validator.dropped_quotes
            
            logger.info("Deduplicating themes...")
            themes = self.deduplicator.dedupe(themes)
            
        report = PulseReport(
            product=self.product_config.display_name,
            iso_week=self.iso_week,
            period_label=f"Last {self.product_config.window_weeks} weeks",
            generated_at=datetime.utcnow(),
            sources_covered=record.sources_covered,
            expected_sources=expected_sources,
            themes=themes,
            counts={
                "reviews": len(reviews),
                "dropped_quotes": record.dropped_quote_count,
                "filtered_short": sum(short_stats.values()),
                "filtered_short_positive": short_stats.get("positive", 0),
                "filtered_short_negative": short_stats.get("negative", 0),
                "filtered_short_neutral": short_stats.get("neutral", 0),
            },
            source_counts=record.review_counts,
            rating_distribution=rating_dist,
            average_rating=avg_rating
        )
        
        # We can eventually pass report to _deliver. For now, print report stats.
        logger.info(f"Generated Pulse Report with {len(themes)} themes and dropped {record.dropped_quote_count} quotes.")
        
        if self.dry_run:
            from pprint import pprint
            import dataclasses
            logger.info("\n=== DRY RUN OUTPUT ===")
            pprint(dataclasses.asdict(report))
            record.status = "partial" if partial_run else "ok"
            record.finished_at = datetime.utcnow()
            return record

        try:
            # Connect to MCP
            await self.mcp.connect()

            # Fixture guard: Do not write test/fixture weeks to real external services
            if self.iso_week == "2026-W99":
                logger.info("Guard: Skipping MCP delivery for test fixture week 2026-W99")
                record.status = "ok"
                return record

            # Phase 3 Delivery
            doc_meta = await self.mcp.docs.find_or_create_doc(self.product_name, f"{self.product_name} Pulse Reports")
            document_id = doc_meta["document_id"]
            record.doc_id = document_id
            
            section_meta = await self.mcp.docs.section_exists(document_id, self.anchor)
            if section_meta.get("exists"):
                logger.info(f"Section {self.anchor} already exists in doc. Skipping append.")
                record.doc_heading_id = section_meta["heading_id"]
                # Assuming deep link logic or retrieving from existing
                # For mocks, we'll just reconstruct a deep link
                record.doc_deep_link = f"https://docs.google.com/document/d/{document_id}/edit#{record.doc_heading_id}"
            else:
                logger.info(f"Appending section {self.anchor} to doc...")
                blocks = ReportBuilder.build_doc_blocks(report)
                append_meta = await self.mcp.docs.append_section(
                    document_id=document_id, 
                    anchor=self.anchor, 
                    heading=f"{self.product_config.display_name} Pulse: {self.iso_week}", 
                    blocks=blocks
                )
                record.doc_heading_id = append_meta["heading_id"]
                record.doc_deep_link = append_meta["deep_link"]
                
            self.ledger.upsert_run(record)
            
            # Email delivery
            if not record.email_draft_id and not record.email_message_id:
                logger.info("Preparing email...")
                html = ReportBuilder.build_email_html(report, record.doc_deep_link)
                text = ReportBuilder.build_email_text(report, record.doc_deep_link)
                subject = f"{self.product_name} Pulse Review: {self.iso_week}"
                
                # Draft default in dev
                if self.send_email:
                    email_meta = await self.mcp.gmail.send_message(self.product_config.recipients, subject, html, text)
                    record.email_message_id = email_meta["message_id"]
                else:
                    email_meta = await self.mcp.gmail.create_draft(self.product_config.recipients, subject, html, text)
                    record.email_draft_id = email_meta["draft_id"]
                    
                logger.info(f"Email processed (Draft: {record.email_draft_id}, Sent: {record.email_message_id})")
                
            record.status = "partial" if partial_run else "ok"
            
        except Exception as e:
            logger.error(f"Delivery failed: {e}")
            record.status = "partial" if record.doc_heading_id else "failed"
            
        finally:
            await self.mcp.close()
            record.finished_at = datetime.utcnow()
            self.ledger.upsert_run(record)
            
            # Feature 2: Save the JSON report for the Frontend Dashboard
            import os
            import json
            import dataclasses
            
            reports_dir = f"data/reports/{self.product_name}"
            os.makedirs(reports_dir, exist_ok=True)
            report_path = f"{reports_dir}/{self.iso_week}.json"
            
            # Need to convert datetime to string for JSON serialization
            def _json_serial(obj):
                if isinstance(obj, (datetime, date)):
                    return obj.isoformat()
                raise TypeError(f"Type {type(obj)} not serializable")
                
            with open(report_path, "w") as f:
                json.dump(dataclasses.asdict(report), f, default=_json_serial, indent=2)
            logger.info(f"Saved JSON report to {report_path}")
            
            # Update manifest.json
            manifest_path = "data/reports/manifest.json"
            manifest = {"products": {}}
            if os.path.exists(manifest_path):
                try:
                    with open(manifest_path, "r") as f:
                        manifest = json.load(f)
                except Exception as e:
                    logger.error(f"Error reading manifest: {e}")
            
            if "products" not in manifest:
                manifest["products"] = {}
                
            if self.product_name not in manifest["products"]:
                manifest["products"][self.product_name] = {
                    "display_name": self.product_config.display_name,
                    "weeks": []
                }
            
            product_data = manifest["products"][self.product_name]
            if self.iso_week not in product_data["weeks"]:
                product_data["weeks"].append(self.iso_week)
                # Sort descending
                product_data["weeks"].sort(reverse=True)
                
            with open(manifest_path, "w") as f:
                json.dump(manifest, f, indent=2)
            
        logger.info(f"Run completed. Status: {record.status}")
        return record


