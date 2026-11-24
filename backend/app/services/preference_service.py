from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.preference import WorkspacePreference
from app.schemas.preference import WorkspacePreferenceUpdate


class PreferenceService:
    @staticmethod
    def get_preferences(db: Session) -> WorkspacePreference:
        pref = (
            db.query(WorkspacePreference)
            .filter(WorkspacePreference.id == "default")
            .first()
        )
        if not pref:
            pref = WorkspacePreference(
                id="default",
                theme="dark",
                sidebar_collapsed=False,
                display_density="comfortable",
                timezone="UTC",
                auto_refresh_enabled=True,
                auto_refresh_interval=30,
            )
            db.add(pref)
            db.commit()
            db.refresh(pref)
        return pref

    @staticmethod
    def update_preferences(
        db: Session, update_data: WorkspacePreferenceUpdate
    ) -> WorkspacePreference:
        pref = PreferenceService.get_preferences(db)
        update_dict = update_data.model_dump(exclude_unset=True)

        for key, val in update_dict.items():
            if hasattr(pref, key) and val is not None:
                setattr(pref, key, val)

        pref.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(pref)
        return pref
