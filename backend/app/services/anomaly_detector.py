import datetime
import math
import json
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from sklearn.ensemble import IsolationForest

from app.models.log import LogEntry
from app.models.anomaly import Anomaly, AnomalyDetectionRun, ServiceBaseline, DetectionConfig

def _extract_meta(l: LogEntry) -> Tuple[Optional[int], Optional[float]]:
    status_code = getattr(l, "status_code", None)
    duration_ms = getattr(l, "duration_ms", None)
    if l.metadata_json:
        try:
            m = json.loads(l.metadata_json) if isinstance(l.metadata_json, str) else l.metadata_json
            if status_code is None and isinstance(m, dict):
                raw_code = m.get("status_code") or m.get("http_status") or m.get("status")
                if raw_code is not None:
                    try:
                        status_code = int(raw_code)
                    except (ValueError, TypeError):
                        pass
            if duration_ms is None and isinstance(m, dict):
                raw_dur = m.get("duration_ms") or m.get("latency_ms") or m.get("response_time_ms")
                if raw_dur is not None:
                    try:
                        duration_ms = float(raw_dur)
                    except (ValueError, TypeError):
                        pass
        except Exception:
            pass
    return status_code, duration_ms

DEFAULT_CONFIG = {
    "z_score_threshold": 3.0,
    "mad_threshold": 3.5,
    "ewma_alpha": 0.3,
    "ewma_threshold_std": 2.5,
    "isolation_forest_contamination": 0.05,
    "min_samples_for_baseline": 5,
    "enabled_algorithms": ["Z_SCORE", "MAD", "EWMA", "ISOLATION_FOREST"],
}


class AnomalyDetectionService:
    def __init__(self, db: Session):
        self.db = db

    def get_configuration(self) -> Dict[str, Any]:
        """Fetch current configuration from database or fallback to defaults."""
        cfg_record = self.db.query(DetectionConfig).filter(DetectionConfig.key == "detection_settings").first()
        if cfg_record and cfg_record.value:
            merged = dict(DEFAULT_CONFIG)
            merged.update(cfg_record.value)
            return merged
        return dict(DEFAULT_CONFIG)

    def update_configuration(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update detection thresholds and persist to database."""
        cfg_record = self.db.query(DetectionConfig).filter(DetectionConfig.key == "detection_settings").first()
        current = self.get_configuration()
        for k, v in updates.items():
            if v is not None:
                current[k] = v

        if not cfg_record:
            cfg_record = DetectionConfig(key="detection_settings", value=current)
            self.db.add(cfg_record)
        else:
            cfg_record.value = current
            cfg_record.updated_at = datetime.datetime.utcnow()

        self.db.commit()
        return current

    def extract_time_windows(
        self,
        start_time: datetime.datetime,
        end_time: datetime.datetime,
        window_minutes: int = 5,
        service_name: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Segment logs into tumbling time windows of size `window_minutes` and compute metric aggregates per service.
        """
        query = self.db.query(LogEntry).filter(
            LogEntry.timestamp >= start_time,
            LogEntry.timestamp <= end_time,
        )
        if service_name:
            query = query.filter(LogEntry.service_name == service_name)

        logs = query.order_by(LogEntry.timestamp.asc()).all()
        if not logs:
            return []

        # Group by service and time window
        window_delta = datetime.timedelta(minutes=window_minutes)
        windows_map: Dict[Tuple[str, datetime.datetime], List[LogEntry]] = {}

        for log in logs:
            if not log.timestamp:
                continue
            ts = log.timestamp
            # Timezone-safe minute bucketing
            min_bucket = (ts.minute // window_minutes) * window_minutes
            bucket_start = ts.replace(minute=min_bucket, second=0, microsecond=0)

            key = (log.service_name, bucket_start)
            if key not in windows_map:
                windows_map[key] = []
            windows_map[key].append(log)

        results = []
        for (svc, w_start), w_logs in sorted(windows_map.items(), key=lambda x: (x[0][0], x[0][1])):
            w_end = w_start + window_delta
            total_logs = len(w_logs)
            error_logs = [l for l in w_logs if str(l.severity).upper() in ("ERROR", "CRITICAL")]
            error_count = len(error_logs)
            error_rate = error_count / total_logs if total_logs > 0 else 0.0

            http_5xx_count = 0
            durations = []
            for l in w_logs:
                sc, dur = _extract_meta(l)
                if sc is not None and 500 <= sc <= 599:
                    http_5xx_count += 1
                if dur is not None:
                    durations.append(dur)

            http_5xx_rate = http_5xx_count / total_logs if total_logs > 0 else 0.0
            p95_latency = float(np.percentile(durations, 95)) if durations else 0.0

            sample_log_ids = [l.id for l in w_logs[:10]]
            sample_messages = [l.message for l in error_logs[:5]] or [l.message for l in w_logs[:3]]
            sample_trace_ids = list({l.trace_id for l in w_logs if l.trace_id})[:5]

            results.append({
                "service_name": svc,
                "window_start": w_start,
                "window_end": w_end,
                "log_volume": float(total_logs),
                "error_count": float(error_count),
                "error_rate": float(error_rate),
                "http_5xx_count": float(http_5xx_count),
                "http_5xx_rate": float(http_5xx_rate),
                "p95_latency_ms": float(p95_latency),
                "sample_log_ids": sample_log_ids,
                "sample_messages": sample_messages,
                "sample_trace_ids": sample_trace_ids,
            })

        return results

    def rebuild_baselines(self, window_str: str = "5m", history_days: int = 7) -> List[ServiceBaseline]:
        """
        Recompute baseline statistics (mean, std, median, MAD, EWMA, p95) for all services.
        """
        window_minutes = 5
        if window_str == "1m":
            window_minutes = 1
        elif window_str == "15m":
            window_minutes = 15
        elif window_str == "1h":
            window_minutes = 60

        end_time = datetime.datetime.utcnow()
        start_time = end_time - datetime.timedelta(days=history_days)

        windows = self.extract_time_windows(start_time, end_time, window_minutes)
        if not windows:
            return []

        df = pd.DataFrame(windows)
        metrics = ["log_volume", "error_rate", "http_5xx_rate", "p95_latency_ms"]
        baselines = []

        for svc, group in df.groupby("service_name"):
            for m in metrics:
                vals = group[m].values
                if len(vals) == 0:
                    continue

                mean_val = float(np.mean(vals))
                std_val = float(np.std(vals))
                median_val = float(np.median(vals))
                abs_diff = np.abs(vals - median_val)
                mad_val = float(np.median(abs_diff)) if len(abs_diff) > 0 else 0.0

                # Compute EWMA mean with alpha=0.3
                alpha = 0.3
                ewma = vals[0]
                for v in vals[1:]:
                    ewma = alpha * v + (1.0 - alpha) * ewma

                p95_val = float(np.percentile(vals, 95))
                min_v = float(np.min(vals))
                max_v = float(np.max(vals))

                baseline = self.db.query(ServiceBaseline).filter(
                    ServiceBaseline.service_name == svc,
                    ServiceBaseline.metric_name == m,
                    ServiceBaseline.time_window == window_str,
                ).first()

                if not baseline:
                    baseline = ServiceBaseline(
                        service_name=svc,
                        metric_name=m,
                        time_window=window_str,
                        mean=mean_val,
                        std_dev=std_val,
                        median=median_val,
                        mad=mad_val,
                        ewma_mean=float(ewma),
                        p95=p95_val,
                        min_val=min_v,
                        max_val=max_v,
                        sample_count=len(vals),
                    )
                    self.db.add(baseline)
                else:
                    baseline.mean = mean_val
                    baseline.std_dev = std_val
                    baseline.median = median_val
                    baseline.mad = mad_val
                    baseline.ewma_mean = float(ewma)
                    baseline.p95 = p95_val
                    baseline.min_val = min_v
                    baseline.max_val = max_v
                    baseline.sample_count = len(vals)
                    baseline.updated_at = datetime.datetime.utcnow()

                baselines.append(baseline)

        self.db.commit()
        return baselines

    def get_service_baseline(self, service_name: str, metric_name: str, time_window: str = "5m") -> Optional[ServiceBaseline]:
        """Retrieve baseline for a given service and metric."""
        return self.db.query(ServiceBaseline).filter(
            ServiceBaseline.service_name == service_name,
            ServiceBaseline.metric_name == metric_name,
            ServiceBaseline.time_window == time_window,
        ).first()

    def run_detection(
        self,
        start_time: Optional[datetime.datetime] = None,
        end_time: Optional[datetime.datetime] = None,
        window_minutes: int = 5,
        service_name: Optional[str] = None,
        algorithm: str = "ALL",
    ) -> AnomalyDetectionRun:
        """
        Execute multi-method anomaly detection across time windows.
        """
        now = datetime.datetime.utcnow()
        if not end_time:
            end_time = now
        if not start_time:
            start_time = end_time - datetime.timedelta(hours=2)

        config = self.get_configuration()
        enabled_algos = config.get("enabled_algorithms", DEFAULT_CONFIG["enabled_algorithms"])

        # Create audit run record
        run_record = AnomalyDetectionRun(
            started_at=now,
            status="RUNNING",
            algorithm=algorithm,
            window_minutes=window_minutes,
            total_windows_analyzed=0,
            anomalies_detected=0,
        )
        self.db.add(run_record)
        self.db.commit()
        self.db.refresh(run_record)

        try:
            windows = self.extract_time_windows(start_time, end_time, window_minutes, service_name)
            run_record.total_windows_analyzed = len(windows)

            if not windows:
                run_record.status = "COMPLETED"
                run_record.completed_at = datetime.datetime.utcnow()
                run_record.summary = {"message": "No log records found in specified time window."}
                self.db.commit()
                return run_record

            new_anomalies: List[Anomaly] = []
            df = pd.DataFrame(windows)

            target_algos = enabled_algos if algorithm == "ALL" else [algorithm]

            for svc, group in df.groupby("service_name"):
                # Run metric-based detectors
                metrics = [
                    ("error_rate", "ERROR_SPIKE"),
                    ("log_volume", "VOLUME_SURGE"),
                    ("http_5xx_rate", "STATUS_5XX_SURGE"),
                    ("p95_latency_ms", "LATENCY_P95_BREACH"),
                ]

                for metric, anomaly_type in metrics:
                    baseline = self.get_service_baseline(svc, metric, f"{window_minutes}m")
                    vals = group[metric].values

                    # Compute fallback baseline if none exists
                    if not baseline or baseline.sample_count < config["min_samples_for_baseline"]:
                        b_mean = float(np.mean(vals))
                        b_std = float(np.std(vals))
                        b_median = float(np.median(vals))
                        b_mad = float(np.median(np.abs(vals - b_median))) if len(vals) > 0 else 0.0
                        b_ewma = b_mean
                    else:
                        b_mean = baseline.mean
                        b_std = baseline.std_dev
                        b_median = baseline.median
                        b_mad = baseline.mad
                        b_ewma = baseline.ewma_mean

                    for _, row in group.iterrows():
                        observed = float(row[metric])

                        # 1. Z-Score Detector
                        if "Z_SCORE" in target_algos:
                            z_thresh = config["z_score_threshold"]
                            denom = b_std if b_std > 1e-4 else (b_mean * 0.2 if b_mean > 0 else 1.0)
                            z_score = (observed - b_mean) / denom

                            if z_score > z_thresh:
                                score = min(1.0, max(0.1, z_score / (z_thresh * 2.0)))
                                severity = self._calculate_severity(score, metric, observed)
                                anomaly = self._create_anomaly(
                                    row, anomaly_type, severity, score, "Z_SCORE",
                                    metric, observed, b_mean, b_mean + z_thresh * denom
                                )
                                new_anomalies.append(anomaly)

                        # 2. Rolling MAD (Modified Z-score) Detector
                        if "MAD" in target_algos:
                            mad_thresh = config["mad_threshold"]
                            denom_mad = b_mad if b_mad > 1e-4 else (b_median * 0.2 if b_median > 0 else 1.0)
                            mod_z = 0.6745 * (observed - b_median) / denom_mad

                            if mod_z > mad_thresh:
                                score = min(1.0, max(0.1, mod_z / (mad_thresh * 2.0)))
                                severity = self._calculate_severity(score, metric, observed)
                                anomaly = self._create_anomaly(
                                    row, anomaly_type, severity, score, "MAD",
                                    metric, observed, b_median, b_median + (mad_thresh * denom_mad / 0.6745)
                                )
                                new_anomalies.append(anomaly)

                        # 3. EWMA Drift & Surge Detector
                        if "EWMA" in target_algos:
                            ewma_thresh_std = config["ewma_threshold_std"]
                            denom_ewma = b_std if b_std > 1e-4 else (b_ewma * 0.25 if b_ewma > 0 else 1.0)
                            deviation = observed - b_ewma
                            if deviation > ewma_thresh_std * denom_ewma:
                                score = min(1.0, max(0.1, deviation / (ewma_thresh_std * denom_ewma * 2.0)))
                                severity = self._calculate_severity(score, metric, observed)
                                anomaly = self._create_anomaly(
                                    row, anomaly_type, severity, score, "EWMA",
                                    metric, observed, b_ewma, b_ewma + ewma_thresh_std * denom_ewma
                                )
                                new_anomalies.append(anomaly)

                # 4. Multivariate Isolation Forest Detector
                if "ISOLATION_FOREST" in target_algos and len(group) >= 4:
                    feature_matrix = group[["log_volume", "error_rate", "http_5xx_rate", "p95_latency_ms"]].values
                    contamination = float(config.get("isolation_forest_contamination", 0.05))
                    contamination = min(0.3, max(0.01, contamination))

                    iso = IsolationForest(
                        contamination=contamination,
                        random_state=42,
                        n_estimators=50,
                    )
                    iso.fit(feature_matrix)
                    preds = iso.predict(feature_matrix)  # -1 for anomaly, 1 for normal
                    scores = -iso.score_samples(feature_matrix)  # Higher is more abnormal

                    for idx, (pred, raw_score) in enumerate(zip(preds, scores)):
                        if pred == -1:
                            row = group.iloc[idx]
                            # Normalize score into [0.5, 1.0]
                            norm_score = min(1.0, max(0.5, float(raw_score)))
                            severity = "CRITICAL" if norm_score >= 0.8 else ("HIGH" if norm_score >= 0.65 else "MEDIUM")
                            anomaly = self._create_anomaly(
                                row, "MULTIVARIATE_ISOLATION_OUTLIER", severity, norm_score, "ISOLATION_FOREST",
                                "multivariate_vector", float(raw_score), 0.0, 0.5
                            )
                            new_anomalies.append(anomaly)

            # Deduplicate anomalies across identical (service, time_window_start, metric, algorithm)
            saved_count = 0
            for anom in new_anomalies:
                existing = self.db.query(Anomaly).filter(
                    Anomaly.service_name == anom.service_name,
                    Anomaly.time_window_start == anom.time_window_start,
                    Anomaly.metric_name == anom.metric_name,
                    Anomaly.algorithm == anom.algorithm,
                ).first()
                if not existing:
                    self.db.add(anom)
                    saved_count += 1

            self.db.commit()

            run_record.status = "COMPLETED"
            run_record.completed_at = datetime.datetime.utcnow()
            run_record.anomalies_detected = saved_count
            run_record.summary = {
                "services_analyzed": df["service_name"].nunique(),
                "total_windows": len(windows),
                "anomalies_found": saved_count,
            }
            self.db.commit()
            return run_record

        except Exception as e:
            self.db.rollback()
            run_record.status = "FAILED"
            run_record.completed_at = datetime.datetime.utcnow()
            run_record.summary = {"error": str(e)}
            self.db.commit()
            raise

    def _calculate_severity(self, score: float, metric: str, observed: float) -> str:
        """Categorize severity based on normalized anomaly score and metric thresholds."""
        if metric in ("error_rate", "http_5xx_rate") and observed >= 0.5:
            return "CRITICAL"
        if score >= 0.85:
            return "CRITICAL"
        if score >= 0.70:
            return "HIGH"
        if score >= 0.45:
            return "MEDIUM"
        return "LOW"

    def _create_anomaly(
        self,
        row: pd.Series,
        anomaly_type: str,
        severity: str,
        score: float,
        algorithm: str,
        metric: str,
        observed: float,
        expected: float,
        threshold: float,
    ) -> Anomaly:
        """Helper to construct an Anomaly model instance with rich diagnostic context."""
        context = {
            "sample_log_ids": row.get("sample_log_ids", []),
            "sample_messages": row.get("sample_messages", []),
            "sample_trace_ids": row.get("sample_trace_ids", []),
            "feature_snapshot": {
                "log_volume": row.get("log_volume", 0),
                "error_rate": row.get("error_rate", 0),
                "http_5xx_rate": row.get("http_5xx_rate", 0),
                "p95_latency_ms": row.get("p95_latency_ms", 0),
            },
        }

        return Anomaly(
            detected_at=datetime.datetime.utcnow(),
            time_window_start=row["window_start"],
            time_window_end=row["window_end"],
            service_name=row["service_name"],
            anomaly_type=anomaly_type,
            severity=severity,
            anomaly_score=round(score, 4),
            algorithm=algorithm,
            metric_name=metric,
            observed_value=round(observed, 4),
            expected_value=round(expected, 4),
            threshold=round(threshold, 4),
            context_payload=context,
            status="ACTIVE",
        )

    def list_anomalies(
        self,
        service: Optional[str] = None,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        algorithm: Optional[str] = None,
        anomaly_type: Optional[str] = None,
        start_time: Optional[datetime.datetime] = None,
        end_time: Optional[datetime.datetime] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[Anomaly], int]:
        """Query anomalies with multidimensional filtering and pagination."""
        query = self.db.query(Anomaly)

        if service:
            query = query.filter(Anomaly.service_name == service)
        if severity and severity.upper() != "ALL":
            query = query.filter(Anomaly.severity == severity.upper())
        if status and status.upper() != "ALL":
            query = query.filter(Anomaly.status == status.upper())
        if algorithm and algorithm.upper() != "ALL":
            query = query.filter(Anomaly.algorithm == algorithm.upper())
        if anomaly_type:
            query = query.filter(Anomaly.anomaly_type == anomaly_type)
        if start_time:
            query = query.filter(Anomaly.detected_at >= start_time)
        if end_time:
            query = query.filter(Anomaly.detected_at <= end_time)

        total = query.count()
        offset = (page - 1) * page_size
        items = query.order_by(Anomaly.detected_at.desc()).offset(offset).limit(page_size).all()
        return items, total

    def get_anomaly_detail(self, anomaly_id: int) -> Optional[Dict[str, Any]]:
        """Get anomaly by ID with surrounding logs and baseline context."""
        anomaly = self.db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
        if not anomaly:
            return None

        # Fetch baseline
        baseline = self.get_service_baseline(anomaly.service_name, anomaly.metric_name)
        baseline_data = None
        if baseline:
            baseline_data = {
                "mean": baseline.mean,
                "std_dev": baseline.std_dev,
                "median": baseline.median,
                "mad": baseline.mad,
                "ewma_mean": baseline.ewma_mean,
                "p95": baseline.p95,
                "min": baseline.min_val,
                "max": baseline.max_val,
            }

        # Fetch surrounding logs: prefer recorded sample_log_ids, or query by time window
        sample_ids = []
        if anomaly.context_payload and isinstance(anomaly.context_payload, dict):
            sample_ids = anomaly.context_payload.get("sample_log_ids", [])

        logs = []
        if sample_ids:
            logs = self.db.query(LogEntry).filter(LogEntry.id.in_(sample_ids)).order_by(LogEntry.timestamp.asc()).all()

        if not logs:
            logs = self.db.query(LogEntry).filter(
                LogEntry.service_name == anomaly.service_name,
                LogEntry.timestamp >= anomaly.time_window_start,
                LogEntry.timestamp <= anomaly.time_window_end,
            ).order_by(LogEntry.timestamp.asc()).limit(20).all()

        surrounding = []
        for l in logs:
            sc, dur = _extract_meta(l)
            surrounding.append({
                "id": l.id,
                "timestamp": l.timestamp.isoformat() if l.timestamp else None,
                "severity": l.severity,
                "message": l.message,
                "trace_id": l.trace_id,
                "duration_ms": dur,
                "status_code": sc,
            })

        return {
            "anomaly": anomaly,
            "baseline": baseline_data,
            "surrounding_logs": surrounding,
        }

    def update_anomaly_status(self, anomaly_id: int, status: str) -> Optional[Anomaly]:
        """Transition anomaly status between ACTIVE, ACKNOWLEDGED, RESOLVED, FALSE_POSITIVE."""
        anomaly = self.db.query(Anomaly).filter(Anomaly.id == anomaly_id).first()
        if not anomaly:
            return None
        anomaly.status = status
        self.db.commit()
        self.db.refresh(anomaly)
        return anomaly

    def get_statistics(self) -> Dict[str, Any]:
        """Aggregate statistical summary of active and recent anomalies."""
        total_active = self.db.query(func.count(Anomaly.id)).filter(Anomaly.status == "ACTIVE").scalar() or 0
        critical = self.db.query(func.count(Anomaly.id)).filter(Anomaly.status == "ACTIVE", Anomaly.severity == "CRITICAL").scalar() or 0
        high = self.db.query(func.count(Anomaly.id)).filter(Anomaly.status == "ACTIVE", Anomaly.severity == "HIGH").scalar() or 0
        medium = self.db.query(func.count(Anomaly.id)).filter(Anomaly.status == "ACTIVE", Anomaly.severity == "MEDIUM").scalar() or 0
        low = self.db.query(func.count(Anomaly.id)).filter(Anomaly.status == "ACTIVE", Anomaly.severity == "LOW").scalar() or 0

        avg_score = self.db.query(func.avg(Anomaly.anomaly_score)).filter(Anomaly.status == "ACTIVE").scalar() or 0.0

        # Most anomalous service
        top_svc = (
            self.db.query(Anomaly.service_name, func.count(Anomaly.id).label("cnt"))
            .filter(Anomaly.status == "ACTIVE")
            .group_by(Anomaly.service_name)
            .order_by(desc("cnt"))
            .first()
        )
        most_anomalous_service = top_svc[0] if top_svc else None

        # Recent 24h trend buckets (hourly)
        now = datetime.datetime.utcnow()
        day_ago = now - datetime.timedelta(hours=24)
        recent_anomalies = self.db.query(Anomaly).filter(Anomaly.detected_at >= day_ago).all()

        trend_buckets: Dict[str, int] = {}
        for i in range(24):
            hour_ts = (day_ago + datetime.timedelta(hours=i)).strftime("%Y-%m-%dT%H:00:00Z")
            trend_buckets[hour_ts] = 0

        for a in recent_anomalies:
            bucket_key = a.detected_at.strftime("%Y-%m-%dT%H:00:00Z")
            if bucket_key in trend_buckets:
                trend_buckets[bucket_key] += 1

        trend_list = [{"timestamp": k, "count": v} for k, v in sorted(trend_buckets.items())]

        return {
            "total_active": total_active,
            "critical_count": critical,
            "high_count": high,
            "medium_count": medium,
            "low_count": low,
            "most_anomalous_service": most_anomalous_service,
            "avg_anomaly_score": round(float(avg_score), 4),
            "recent_trend": trend_list,
        }
