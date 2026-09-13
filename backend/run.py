import socket
import sys

import uvicorn

from app.core.config import get_settings

if __name__ == "__main__":
    settings = get_settings()
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.settimeout(0.5)
        if probe.connect_ex(("127.0.0.1", settings.port)) == 0:
            print(
                f"Backend is already running on http://127.0.0.1:{settings.port}. "
                "Stop the existing server before starting another one.",
                file=sys.stderr,
            )
            raise SystemExit(0)
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.port, reload=False, log_level="info")
