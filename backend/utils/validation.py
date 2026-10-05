from typing import Annotated
from pydantic import AfterValidator, HttpUrl, TypeAdapter

_http_url = TypeAdapter(HttpUrl)


def validate_http_url(value: str) -> str:
    return str(_http_url.validate_python(value))


HTTPURL = Annotated[str, AfterValidator(validate_http_url)]
