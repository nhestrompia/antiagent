"""Record pinned Chromium capture/protection call sites from primary sources."""
import base64
import hashlib
import json
from pathlib import Path
import urllib.request

REVISION = "155.0.8059.80"
SOURCES = {
    "content/browser/devtools/protocol/page_handler.cc": ["void PageHandler::CaptureScreenshot(", "wc->IncrementCapturerCount", "tmp_params.view_size = gfx::Size(1, 1)", "if (clip) {"],
    "content/browser/devtools/protocol/emulation_handler.cc": ["void EmulationHandler::SetDeviceEmulationParams"],
    "content/browser/web_contents/web_contents_impl.cc": ["WebContentsImpl::IncrementCapturerCount", "WebContentsImpl::DecrementCapturerCount"],
    "content/browser/web_contents/web_contents_view_mac.mm": ["WebContentsViewMac::OnCapturerCountChanged"],
    "third_party/blink/renderer/platform/widget/widget_base.cc": ["void WidgetBase::ForceRedraw"],
}


records = []
for path, needles in SOURCES.items():
    url = f"https://chromium.googlesource.com/chromium/src/+/{REVISION}/{path}?format=TEXT"
    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            data = base64.b64decode(response.read())
        lines = data.decode().splitlines()
        anchors = []
        for needle in needles:
            matches = [index for index, line in enumerate(lines) if needle in line]
            if not matches:
                raise ValueError(f"Expected source anchor missing: {needle}")
            for index in matches:
                start, end = max(0, index - 5), min(len(lines), index + 35)
                anchors.append({"needle": needle, "line": index + 1, "startLine": start + 1,
                                "text": "\n".join(lines[start:end])})
        records.append({"path": path, "url": url, "sha256": hashlib.sha256(data).hexdigest(),
                        "lineCount": len(lines), "anchors": anchors})
    except Exception as error:
        records.append({"path": path, "url": url, "error": str(error)})

report = {"revision": REVISION, "records": records}
target = Path(__file__).resolve().parent.parent / "docs" / "page-capture-event-source-audit.json"
target.write_text(json.dumps(report, indent=2) + "\n")
errors = [record for record in records if "error" in record]
print(json.dumps({"revision": REVISION, "files": len(records), "errors": errors}, indent=2))
if errors:
    raise SystemExit(1)
