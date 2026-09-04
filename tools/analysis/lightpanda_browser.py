"""Lightpanda-backed public web source inspector.

This tool intentionally exposes the browser as a research/source capability,
not as a hidden orchestrator. It obeys robots.txt, blocks private network
targets, caps captured output, and records the requested source URL.
"""

from __future__ import annotations

import ipaddress
import os
import shutil
import socket
import subprocess
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from tools.base_tool import (
    BaseTool,
    DependencyError,
    Determinism,
    ExecutionMode,
    ResourceProfile,
    ToolResult,
    ToolRuntime,
    ToolStability,
    ToolTier,
)


class LightpandaBrowser(BaseTool):
    name = "lightpanda_browser"
    version = "0.1.0"
    tier = ToolTier.SOURCE
    capability = "research"
    provider = "lightpanda"
    stability = ToolStability.BETA
    execution_mode = ExecutionMode.SYNC
    determinism = Determinism.DETERMINISTIC
    runtime = ToolRuntime.HYBRID

    dependencies: list[str] = []
    install_instructions = (
        "Install the SB2020/browser Lightpanda fork in WSL or Docker, or set "
        "LIGHTPANDA_BIN to a runnable Lightpanda binary."
    )
    agent_skills = ["lightpanda-browser"]
    capabilities = ["fetch_public_page_html", "fetch_public_page_markdown", "agent_web_research_source"]
    input_schema = {
        "type": "object",
        "required": ["url"],
        "properties": {
            "url": {"type": "string", "format": "uri"},
            "format": {"type": "string", "enum": ["html", "markdown"], "default": "markdown"},
            "wait_selector": {"type": "string"},
            "wait_ms": {"type": "integer", "minimum": 0, "maximum": 15000},
            "timeout_seconds": {"type": "integer", "minimum": 1, "maximum": 60, "default": 20},
        },
    }
    output_schema = {
        "type": "object",
        "required": ["url", "format", "content", "provider"],
        "properties": {
            "url": {"type": "string"},
            "format": {"type": "string"},
            "content": {"type": "string"},
            "provider": {"type": "string", "const": "lightpanda"},
            "transport": {"type": "string"},
        },
    }
    supports = {"javascript": True, "robots": True, "private_network": False, "max_output_bytes": 3_145_728}
    best_for = ["Fast public-page research", "JavaScript-rendered metadata", "Source discovery before asset selection"]
    not_good_for = ["Authenticated browsing", "Private network URLs", "Pixel-perfect screenshots", "Unattended bulk crawling"]
    resource_profile = ResourceProfile(cpu_cores=1, ram_mb=256, disk_mb=20, network_required=True)
    side_effects = ["Makes one public network request through Lightpanda"]
    user_visible_verification = ["Inspect returned source URL, provider, transport and captured content"]

    @staticmethod
    def _resolve_command() -> tuple[list[str], str] | None:
        configured = os.environ.get("LIGHTPANDA_BIN")
        if configured and Path(configured).is_file():
            return [configured], "configured"
        native = shutil.which("lightpanda")
        if native:
            return [native], "native"
        if os.name == "nt" and shutil.which("wsl.exe"):
            try:
                probe = subprocess.run(
                    ["wsl.exe", "--exec", "lightpanda", "version"],
                    capture_output=True, text=True, timeout=5, check=False,
                )
                if probe.returncode == 0:
                    return ["wsl.exe", "--exec", "lightpanda"], "wsl"
            except (OSError, subprocess.TimeoutExpired):
                pass
        return None

    def check_dependencies(self) -> None:
        if self._resolve_command() is None:
            raise DependencyError(self.install_instructions)

    @staticmethod
    def _validated_public_url(value: str) -> str:
        parsed = urlparse(str(value or "").strip())
        if parsed.scheme not in {"http", "https"} or not parsed.hostname:
            raise ValueError("url must be a complete public http:// or https:// URL")
        if parsed.username or parsed.password:
            raise ValueError("URLs containing credentials are not supported")
        for result in socket.getaddrinfo(parsed.hostname, parsed.port or (443 if parsed.scheme == "https" else 80)):
            address = ipaddress.ip_address(result[4][0])
            if not address.is_global:
                raise ValueError("Local and private network URLs are blocked")
        return parsed.geturl()

    def execute(self, inputs: dict[str, Any]) -> ToolResult:
        started = time.time()
        try:
            url = self._validated_public_url(inputs["url"])
            resolved = self._resolve_command()
            if resolved is None:
                return ToolResult(success=False, error=self.install_instructions)
            command, transport = resolved
            output_format = inputs.get("format", "markdown")
            args = [*command, "fetch", "--obey-robots", "--dump", output_format]
            if inputs.get("wait_selector"):
                args.extend(["--wait-selector", str(inputs["wait_selector"])])
            if inputs.get("wait_ms") is not None:
                args.extend(["--wait-ms", str(inputs["wait_ms"])])
            args.append(url)
            result = subprocess.run(
                args, capture_output=True, timeout=int(inputs.get("timeout_seconds", 20)), check=False,
            )
            if result.returncode != 0:
                return ToolResult(success=False, error=result.stderr.decode("utf-8", "replace")[-4000:])
            if len(result.stdout) > 3_145_728:
                return ToolResult(success=False, error="Lightpanda output exceeded the 3 MB safety limit")
            return ToolResult(
                success=True,
                data={
                    "url": url,
                    "format": output_format,
                    "content": result.stdout.decode("utf-8", "replace"),
                    "provider": "lightpanda",
                    "transport": transport,
                },
                duration_seconds=round(time.time() - started, 3),
            )
        except (KeyError, ValueError, OSError, socket.gaierror, subprocess.TimeoutExpired) as error:
            return ToolResult(success=False, error=str(error))
