import requests, json, os, datetime
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path

TOKEN = os.environ["GITHUB_TOKEN"]
REPO = "randheimer/KaizerIDE"
HEADERS = {"Authorization": f"token {TOKEN}", "Accept": "application/vnd.github.v3+json"}
HISTORY_FILE = "traffic_history.json"

def fetch(endpoint):
    r = requests.get(f"https://api.github.com/repos/{REPO}/traffic/{endpoint}", headers=HEADERS)
    return r.json()

def load_history():
    if Path(HISTORY_FILE).exists():
        with open(HISTORY_FILE) as f:
            return json.load(f)
    return {"clones": {}, "views": {}}

def save_history(h):
    with open(HISTORY_FILE, "w") as f:
        json.dump(h, f, indent=2)

def merge(history, new_data, key):
    for entry in new_data.get(key, []):
        date = entry["timestamp"][:10]
        history[key][date] = entry["count"]

def plot(history, key, label, color, filename):
    dates = sorted(history[key].keys())
    values = [history[key][d] for d in dates]
    parsed = [datetime.datetime.strptime(d, "%Y-%m-%d") for d in dates]

    fig, ax = plt.subplots(figsize=(12, 4))
    fig.patch.set_facecolor("#0d1117")
    ax.set_facecolor("#0d1117")
    ax.plot(parsed, values, color=color, linewidth=2, marker="o", markersize=4)
    ax.fill_between(parsed, values, alpha=0.15, color=color)
    ax.set_title(f"{label} over time", color="white", fontsize=14)
    ax.tick_params(colors="white")
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%m/%d"))
    ax.xaxis.set_major_locator(mdates.WeekdayLocator())
    plt.xticks(rotation=45)
    for spine in ax.spines.values():
        spine.set_edgecolor("#30363d")
    ax.yaxis.label.set_color("white")
    ax.grid(axis="y", color="#21262d", linewidth=0.8)
    plt.tight_layout()
    Path("graphs").mkdir(exist_ok=True)
    plt.savefig(f"graphs/{filename}", dpi=100, bbox_inches="tight")
    plt.close()

history = load_history()
merge(history, fetch("clones"), "clones")
merge(history, fetch("views"), "views")
save_history(history)
plot(history, "clones", "Git Clones", "#39d353", "clones.png")
plot(history, "views", "Visitors", "#58a6ff", "views.png")
