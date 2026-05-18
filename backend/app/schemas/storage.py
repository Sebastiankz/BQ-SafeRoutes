from pydantic import BaseModel


class StorageUploadOut(BaseModel):
    foto_url: str
    bucket: str
    path: str
