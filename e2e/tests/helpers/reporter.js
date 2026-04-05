/**
 * BrowseShield Assessment Reporter
 *
 * Custom Playwright reporter that reads assessment annotations from test results
 * and generates a condensed summary table (console + JSON file).
 */

import fs from "fs";
import path from "path";

class AssessmentReporter {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.resolve(import.meta.dirname, "..", "..", "reports");
    this.results = [];
  }

  onTestEnd(test, result) {
    const annotation = test.annotations.find((a) => a.type === "assessment");
    if (!annotation) return;

    try {
      const data = JSON.parse(annotation.description);
      this.results.push({
        ...data,
        status: result.status,
        duration_ms: result.duration,
      });
    } catch {
      // Skip malformed annotations
    }
  }

  onEnd(result) {
    if (this.results.length === 0) return;

    const passed = this.results.filter((r) => r.status === "passed").length;
    const failed = this.results.filter((r) => r.status === "failed").length;
    const other = this.results.length - passed - failed;

    // Console summary
    console.log("\n");
    console.log("═".repeat(80));
    console.log(
      `  BrowseShield E2E Report — ${new Date().toISOString().split("T")[0]}`,
    );
    console.log(
      `  Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}${other ? ` | Other: ${other}` : ""}`,
    );
    console.log("═".repeat(80));
    console.log(
      padRight("  URL", 40) +
        padRight("Expected", 12) +
        padRight("Actual", 12) +
        padRight("Conf", 8) +
        padRight("Score", 8) +
        "Status",
    );
    console.log("─".repeat(80));

    for (const r of this.results) {
      const url = truncate(r.url || "?", 37);
      const expected = r.expected || "(smoke)";
      const actual = r.actual || "ERR";
      const conf =
        r.confidence != null ? `${Math.round(r.confidence)}%` : "—";
      const score =
        r.final_score != null ? r.final_score.toFixed(3) : "—";
      const status = r.status === "passed" ? "PASS" : "FAIL";

      console.log(
        `  ${padRight(url, 38)}${padRight(expected, 12)}${padRight(actual, 12)}${padRight(conf, 8)}${padRight(score, 8)}${status}`,
      );
    }

    console.log("═".repeat(80));

    // Write JSON summary
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const summaryPath = path.join(this.outputDir, `assessment-summary-${ts}.json`);
    const summary = {
      run_timestamp: new Date().toISOString(),
      total: this.results.length,
      passed,
      failed,
      sites: this.results,
    };

    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    console.log(`\n  Summary written to: ${summaryPath}\n`);
  }
}

function padRight(str, len) {
  return String(str).padEnd(len);
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export default AssessmentReporter;
