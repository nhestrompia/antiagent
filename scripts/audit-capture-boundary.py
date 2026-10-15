"""Record pinned Chromium capture/protection call sites from primary sources."""
import base64
import hashlib
import json
from pathlib import Path
import urllib.request

REVISION = "155.0.8059.40"
SOURCES = {
    "media/cdm/cdm_adapter.cc": ["metadata().protected_video"],
    "media/renderers/video_resource_updater.cc": ["kSoftwareProtected", "nearest_neighbor, false, protected_video_type"],
    "components/viz/common/quads/texture_draw_quad.cc": ["secure_output_only = secure_output"],
    "ui/accelerated_widget_mac/ca_renderer_layer_tree.mm": ["preventsCapture"],
    "components/viz/service/display/surface_aggregator.cc": ["secure_output_only"],
    "content/browser/renderer_host/render_widget_host_impl.cc": ["void RenderWidgetHostImpl::GetSnapshotFromBrowser", "void RenderWidgetHostImpl::GotResponseToForceRedraw"],
    "content/browser/renderer_host/render_widget_host_view_mac.mm": ["void RenderWidgetHostViewMac::CopyFromSurface"],
    "content/browser/renderer_host/render_widget_host_view_base.cc": ["void RenderWidgetHostViewBase::CopyMainAndPopupFromSurface", "main_frame_host->CopyFromCompositingSurface(src_subrect"],
    "content/browser/renderer_host/delegated_frame_host.cc": ["void DelegatedFrameHost::CopyFromCompositingSurfaceInternal"],
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
                start, end = max(0, index - 5), min(len(lines), index + 15)
                anchors.append({"needle": needle, "line": index + 1, "startLine": start + 1,
                                "text": "\n".join(lines[start:end])})
        records.append({"path": path, "url": url, "sha256": hashlib.sha256(data).hexdigest(),
                        "lineCount": len(lines), "anchors": anchors})
    except Exception as error:
        records.append({"path": path, "url": url, "error": str(error)})

report = {"revision": REVISION, "records": records}
target = Path(__file__).resolve().parent.parent / "docs" / "capture-boundary-source-audit.json"
target.write_text(json.dumps(report, indent=2) + "\n")
errors = [record for record in records if "error" in record]
print(json.dumps({"revision": REVISION, "files": len(records), "errors": errors}, indent=2))
if errors:
    raise SystemExit(1)
