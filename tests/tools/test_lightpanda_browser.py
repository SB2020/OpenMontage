from __future__ import annotations

import subprocess

from tools.analysis.lightpanda_browser import LightpandaBrowser


def test_rejects_private_network(monkeypatch):
    monkeypatch.setattr(
        "tools.analysis.lightpanda_browser.socket.getaddrinfo",
        lambda *_args, **_kwargs: [(2, 1, 6, "", ("127.0.0.1", 80))],
    )
    result = LightpandaBrowser().execute({"url": "http://localhost/private"})
    assert not result.success
    assert "private network" in result.error.lower()


def test_fetches_fresh_public_source(monkeypatch):
    monkeypatch.setattr(LightpandaBrowser, "_resolve_command", staticmethod(lambda: (["lightpanda"], "proof")))
    monkeypatch.setattr(
        "tools.analysis.lightpanda_browser.socket.getaddrinfo",
        lambda *_args, **_kwargs: [(2, 1, 6, "", ("93.184.216.34", 443))],
    )
    monkeypatch.setattr(
        "tools.analysis.lightpanda_browser.subprocess.run",
        lambda *args, **kwargs: subprocess.CompletedProcess(args[0], 0, stdout=b"# Fresh source", stderr=b""),
    )
    result = LightpandaBrowser().execute({"url": "https://example.com/page", "format": "markdown"})
    assert result.success
    assert result.data["provider"] == "lightpanda"
    assert result.data["content"] == "# Fresh source"
    assert "--obey-robots" in result.data.get("content", "") or result.data["transport"] == "proof"

