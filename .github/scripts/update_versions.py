"""Check both self-contained OBS overlays and refresh their version manifest."""
import hashlib
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path


class InlineJavaScript(HTMLParser):
    def __init__(self):
        super().__init__()
        self.scripts = []
        self.handlers = []
        self.mode = None
        self.parts = []

    def handle_starttag(self, tag, attributes):
        for name, value in attributes:
            if name.startswith("on") and value:
                self.handlers.append(value)
        if tag == "script":
            attrs = dict(attributes)
            kind = (attrs.get("type") or "").split(";")[0].strip().lower()
            if "src" not in attrs:
                if kind in ("", "text/javascript", "application/javascript"):
                    self.mode = "commonjs"
                elif kind == "module":
                    self.mode = "module"

    def handle_data(self, data):
        if self.mode:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.mode:
            self.scripts.append((self.mode, "".join(self.parts)))
            self.parts.clear()
            self.mode = None


def check_javascript(path, html):
    parser = InlineJavaScript()
    parser.feed(html)
    parser.close()
    if parser.mode or not parser.scripts:
        raise ValueError(f"{path}: missing or unclosed script")
    checks = [(f"script {i}", mode, code)
              for i, (mode, code) in enumerate(parser.scripts, start=1)]
    if parser.handlers:
        handlers = "\n".join("(function (event) {\n" + code + "\n});" for code in parser.handlers)
        checks.append(("event handlers", "commonjs", handlers))
    for label, mode, code in checks:
        result = subprocess.run(
            ["node", "--check", f"--input-type={mode}", "-"],
            input=code, text=True, capture_output=True,
        )
        if result.returncode:
            # A single source line can contain megabytes of embedded artwork.
            details = [line[:240] for line in result.stderr.splitlines() if line.strip()][:5]
            raise ValueError(f"{path} ({label}): " + "\n".join(details))


def stamp_overlay(project):
    path = Path(f"{project}.html")
    original = path.read_bytes()
    check_javascript(path, original.decode("utf-8"))
    marker = re.compile(
        rb'<script id="live-el-auto-updater" data-project="' + project.encode("ascii")
        + rb'" data-version="([0-9a-f]{16})">'
    )
    matches = list(marker.finditer(original))
    if len(matches) != 1:
        raise ValueError(f"{path}: expected one version stamp, found {len(matches)}")
    start, end = matches[0].span(1)
    # The stamp cannot hash itself. Every other byte, including artwork, counts.
    normalized = original[:start] + b"0" * 16 + original[end:]
    version = hashlib.sha256(normalized).hexdigest()[:16]
    if original[start:end] != version.encode("ascii"):
        path.write_bytes(original[:start] + version.encode("ascii") + original[end:])
    return version


if __name__ == "__main__":
    manifest = Path("version.json")
    versions = json.loads(manifest.read_text(encoding="utf-8")) if manifest.exists() else {}
    for project in ("chat", "familiars"):
        versions[project] = stamp_overlay(project)
        print(f"{project}.html: {versions[project]}")
    manifest.write_text(json.dumps(versions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
