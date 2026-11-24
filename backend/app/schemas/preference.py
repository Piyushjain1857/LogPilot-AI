from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict, field_validator
import zoneinfo

VALID_THEMES = {"dark", "light", "system"}
VALID_DENSITIES = {"comfortable", "compact"}
VALID_REFRESH_INTERVALS = {5, 10, 15, 30, 60, 300}


class WorkspacePreferenceBase(BaseModel):
    theme: str = "dark"
    sidebar_collapsed: bool = False
    display_density: str = "comfortable"
    timezone: str = "UTC"
    auto_refresh_enabled: bool = True
    auto_refresh_interval: int = 30

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: str) -> str:
        if v not in VALID_THEMES:
            raise ValueError(f"Invalid theme: {v}. Must be one of {VALID_THEMES}")
        return v

    @field_validator("display_density")
    @classmethod
    def validate_density(cls, v: str) -> str:
        if v not in VALID_DENSITIES:
            raise ValueError(f"Invalid density: {v}. Must be one of {VALID_DENSITIES}")
        return v

    @field_validator("timezone")
    @classmethod
    def validate_tz(cls, v: str) -> str:
        try:
            zoneinfo.ZoneInfo(v)
        except Exception:
            raise ValueError(f"Invalid timezone identifier: {v}")
        return v

    @field_validator("auto_refresh_interval")
    @classmethod
    def validate_interval(cls, v: int) -> int:
        if v not in VALID_REFRESH_INTERVALS:
            raise ValueError(
                f"Invalid auto_refresh_interval: {v}. Must be one of {VALID_REFRESH_INTERVALS}"
            )
        return v


class WorkspacePreferenceUpdate(BaseModel):
    theme: Optional[str] = None
    sidebar_collapsed: Optional[bool] = None
    display_density: Optional[str] = None
    timezone: Optional[str] = None
    auto_refresh_enabled: Optional[bool] = None
    auto_refresh_interval: Optional[int] = None

    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_THEMES:
            raise ValueError(f"Invalid theme: {v}. Must be one of {VALID_THEMES}")
        return v

    @field_validator("display_density")
    @classmethod
    def validate_density(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_DENSITIES:
            raise ValueError(f"Invalid density: {v}. Must be one of {VALID_DENSITIES}")
        return v

    @field_validator("timezone")
    @classmethod
    def validate_tz(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            try:
                zoneinfo.ZoneInfo(v)
            except Exception:
                raise ValueError(f"Invalid timezone identifier: {v}")
        return v

    @field_validator("auto_refresh_interval")
    @classmethod
    def validate_interval(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v not in VALID_REFRESH_INTERVALS:
            raise ValueError(
                f"Invalid auto_refresh_interval: {v}. Must be one of {VALID_REFRESH_INTERVALS}"
            )
        return v


class WorkspacePreferenceResponse(WorkspacePreferenceBase):
    id: str
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
