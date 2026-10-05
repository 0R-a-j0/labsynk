"""Bound incoming bodies and expensive public requests before route processing.

Limits are per worker and use the socket peer, never untrusted forwarded headers.
Multi-worker deployments should also enforce shared limits at the ingress.
"""
from collections import OrderedDict
from time import monotonic
from starlette.responses import JSONResponse


class RequestLimitsMiddleware:
    def __init__(self, app):
        self.app = app
        self.windows = OrderedDict()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        path = scope.get("path", "").rstrip("/")
        limits = {"/auth/login": 10, "/ai/chat": 20, "/engagement/inventory/report": 10}
        if scope["method"] == "POST" and path in limits:
            now = monotonic()
            key = ((scope.get("client") or ("unknown",))[0], path)
            start, count = self.windows.get(key, (now, 0))
            if now - start >= 60:
                start, count = now, 0
            if count >= limits[path]:
                response = JSONResponse({"detail": "Too many requests; try again later"}, 429,
                                        headers={"Retry-After": str(max(1, int(60 - (now - start))))})
                return await response(scope, receive, send)
            self.windows[key] = (start, count + 1)
            self.windows.move_to_end(key)
            if len(self.windows) > 10000:
                self.windows.popitem(last=False)
        if scope["method"] in {"POST", "PUT", "PATCH"}:
            is_upload = path in {"/syllabus/upload", "/ai/parse-syllabus"} or path.endswith("/lab-manual")
            limit = 11 * 1024 * 1024 if is_upload else 128 * 1024
            body = bytearray()
            while True:
                message = await receive()
                if message["type"] == "http.disconnect":
                    return
                chunk = message.get("body", b"")
                if len(body) + len(chunk) > limit:
                    response = JSONResponse({"detail": "Request body too large"}, 413)
                    return await response(scope, receive, send)
                body.extend(chunk)
                if not message.get("more_body", False):
                    break
            delivered = False

            async def bounded_receive():
                nonlocal delivered
                if not delivered:
                    delivered = True
                    return {"type": "http.request", "body": bytes(body), "more_body": False}
                return await receive()

            return await self.app(scope, bounded_receive, send)
        return await self.app(scope, receive, send)
