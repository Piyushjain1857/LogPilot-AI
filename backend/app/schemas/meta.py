from pydantic import BaseModel


class MetaResponse(BaseModel):
    name: str
    version: str
    description: str
