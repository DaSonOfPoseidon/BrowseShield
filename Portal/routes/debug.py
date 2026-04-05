import json
import os

from flask import Blueprint, abort, send_from_directory, render_template_string
from flask_login import login_required

debug = Blueprint("debug", __name__)

_default = "/app/e2e-reports" if os.path.isdir("/app/e2e-reports") else os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "e2e", "reports")
)
REPORTS_DIR = os.environ.get("E2E_REPORTS_DIR", _default)

HTML_DIR = os.path.join(REPORTS_DIR, "html")

PRETTY_JSON_TEMPLATE = """\
<!DOCTYPE html>
<html><head>
<title>{{ filename }}</title>
<style>
  body { background: #1e1e2e; color: #cdd6f4; font-family: monospace; margin: 2rem; }
  pre { background: #313244; padding: 1.5rem; border-radius: 8px; overflow-x: auto; font-size: 14px; }
  a { color: #89b4fa; }
  h1 { font-size: 1.2rem; }
</style>
</head><body>
<h1>{{ filename }}</h1>
<a href="/debug/e2e/reports">&larr; Back to file list</a>
<pre>{{ content }}</pre>
</body></html>
"""

FILE_LIST_TEMPLATE = """\
<!DOCTYPE html>
<html><head>
<title>E2E Reports</title>
<style>
  body { background: #1e1e2e; color: #cdd6f4; font-family: monospace; margin: 2rem; }
  a { color: #89b4fa; display: block; padding: 0.4rem 0; }
  h1 { font-size: 1.2rem; }
</style>
</head><body>
<h1>E2E Report Files</h1>
{% for f in files %}
<a href="/debug/e2e/reports/{{ f }}">{{ f }}</a>
{% endfor %}
{% if not files %}
<p>No report files found. Run the E2E tests first.</p>
{% endif %}
</body></html>
"""


@debug.route("/debug/e2e/results")
@login_required
def e2e_results():
    index = os.path.join(HTML_DIR, "index.html")
    if not os.path.isfile(index):
        abort(404, description="No Playwright report found. Run the E2E tests first.")
    return send_from_directory(HTML_DIR, "index.html")


@debug.route("/debug/e2e/results/<path:filename>")
@login_required
def e2e_results_assets(filename):
    return send_from_directory(HTML_DIR, filename)


@debug.route("/debug/e2e/reports")
@login_required
def e2e_reports_list():
    files = sorted(f for f in os.listdir(REPORTS_DIR) if os.path.isfile(os.path.join(REPORTS_DIR, f)))
    return render_template_string(FILE_LIST_TEMPLATE, files=files)


@debug.route("/debug/e2e/reports/<path:filename>")
@login_required
def e2e_reports_file(filename):
    filepath = os.path.join(REPORTS_DIR, filename)
    if not os.path.isfile(filepath):
        abort(404)
    if filename.endswith(".json"):
        with open(filepath) as f:
            data = json.load(f)
        content = json.dumps(data, indent=2)
        return render_template_string(PRETTY_JSON_TEMPLATE, filename=filename, content=content)
    return send_from_directory(REPORTS_DIR, filename)
