from bson import ObjectId
from bson.errors import InvalidId

from app.core.exceptions import BadRequestError


def to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        raise BadRequestError("Invalid identifier")


def serialize_doc(doc: dict) -> dict:
    if doc is None:
        return doc
    result = dict(doc)
    if "_id" in result:
        result["id"] = str(result.pop("_id"))
    return result
