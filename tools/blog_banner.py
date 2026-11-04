#!/usr/bin/env python3
"""Blog-Banner: wählt für jeden Artikel in _posts/ einen Banner und schreibt ihn nach _data/blog_banner.yml.

Aufruf (im Repo-Ordner):
  python3 tools/blog_banner.py          # ergänzt nur Artikel, die noch keinen Eintrag haben
  python3 tools/blog_banner.py --alle   # wählt alles neu (überschreibt Hand-Änderungen)
  python3 tools/blog_banner.py --tabelle  # zeigt nur die Tabelle Artikel -> Banner

Regeln (Anna-Lena, 04.11.2026):
  - Produkt-Banner, wenn das Thema passt (erste passende Regel in THEMEN gewinnt).
  - Sonst ein Lese-Tipp „Passt dazu“ mit 1–2 ähnlichen Artikeln.
  - Abwechseln: Artikel mit gleichem Thema bekommen der Reihe nach die Banner aus der Liste des Themas.
  - Hat der Artikel schon eine CTA-Box zu /mamatequiero/, gibt es keinen zweiten Werbe-Banner (dann Lese-Tipp).
Nur Python-Standardbibliothek.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POSTS = os.path.join(ROOT, "_posts")
DATA = os.path.join(ROOT, "_data", "blog_banner.yml")
MARKER = "# --- artikel (von tools/blog_banner.py erzeugt, Hand-Änderungen erlaubt) ---"

# Thema: (Suchmuster in Slug + Titel, Banner der Reihe nach). Reihenfolge = Vorrang (Planung vor Advent vor Stress).
THEMEN = [
    ("planung", r"mental load|brain dump|brain-dump|morgenroutine|nein sagen|vorsätze|vorsaetze|intention|jahresrückblick|"
                r"jahresrueckblick|homeoffice|perfektionis|digital detox|planung|neuanfang", ["familienjahr", "kalender"]),
    ("advent", r"advent|winter|feiertag|weihnacht|dezember", ["advent", "affirmationen"]),
    ("stress", r"stress|wut|gedankenkarussell|grübeln|gruebeln|unruhe|überforderung|ueberforderung|anspannung",
     ["lernen", "lesetipp"]),
    ("mama", r"selbstfürsorge|selbstfuersorge|mama|mütter|muetter|mutter|frauenkreis|selbstmitgefühl|selbstmitgefuehl|"
             r"kritiker|schlechtes gewissen", ["mamatequiero", "affirmationen"]),
    ("journaling", r"journal|affirmation|dankbarkeit|aufschreiben", ["affirmationen", "lesetipp"]),
]
STOP = set("""warum wie was wenn sollst sollte meditieren meditation übung übungen uebungen einfach minuten
für fuer deine einen eine einer nicht ohne dich mit und oder der die das zu hause anleitung anfänger anfaenger""".split())


def read_posts():
    posts = []
    for fn in sorted(os.listdir(POSTS)):
        if not fn.endswith(".md"):
            continue
        txt = open(os.path.join(POSTS, fn), encoding="utf-8").read()
        fm = txt.split("---", 2)[1]
        body = txt.split("---", 2)[2]

        def get(key):
            m = re.search(r"^%s:\s*(.+)$" % key, fm, re.M)
            return m.group(1).strip().strip('"') if m else ""
        cta = re.search(r"^cta:\s*\n(?:\s+.*\n)*?\s+url:\s*(\S+)", fm, re.M)
        slug = fn[11:-3]
        posts.append({
            "slug": slug, "date": fn[:10], "title": get("title"), "topic": get("topic"),
            "keywords": get("keywords").strip("[]"), "cta": cta.group(1) if cta else "",
            "h2": len(re.findall(r"^## ", body, re.M)),
        })
    return posts


def words(p):
    txt = (p["title"] + " " + p["keywords"] + " " + p["slug"].replace("-", " ")).lower()
    return {w for w in re.findall(r"[a-zäöüß]{5,}", txt) if w not in STOP}


def thema(p):
    hay = (p["slug"].replace("-", " ") + " " + p["title"]).lower()
    for name, pat, _ in THEMEN:
        if re.search(pat, hay) or (name == "journaling" and p["topic"] == "journaling"):
            return name
    return ""


def lesetipp(p, posts):
    """1–2 ähnliche Artikel; bevorzugt ältere (die sind sicher schon online)."""
    w = words(p)
    scored = []
    for q in posts:
        if q is p:
            continue
        s = len(w & words(q)) + (2 if q["topic"] == p["topic"] else 0) + (1 if thema(q) and thema(q) == thema(p) else 0)
        if s < 2:
            continue
        older = q["date"] < p["date"]
        scored.append((not older, -s, abs((int(q["date"][:4]) * 400 + int(q["date"][5:7]) * 32 + int(q["date"][8:])) -
                                          (int(p["date"][:4]) * 400 + int(p["date"][5:7]) * 32 + int(p["date"][8:]))), q["slug"]))
    scored.sort()
    return [s[3] for s in scored[:2]]


def choose(posts):
    turn = {name: 0 for name, _, _ in THEMEN}
    out = {}
    for p in posts:  # nach Datum
        t = thema(p)
        cands = next((c for n, _, c in THEMEN if n == t), ["lesetipp"])
        b = cands[turn[t] % len(cands)] if t else "lesetipp"
        if t:
            turn[t] += 1
        if p["cta"].startswith("/mamatequiero"):
            b = "lesetipp"   # CTA-Box wirbt schon für Mamá te quiero
        e = {"banner": b, "thema": t or "-"}
        if b == "lesetipp":
            e["lesetipp"] = lesetipp(p, posts)
        out[p["slug"]] = e
    return out


def existing():
    if not os.path.exists(DATA):
        return "", {}
    txt = open(DATA, encoding="utf-8").read()
    head, _, tail = txt.partition(MARKER)
    entries = {}
    for m in re.finditer(r"^  ([a-z0-9-]+):\n((?:    .*\n)+)", tail, re.M):
        entries[m.group(1)] = m.group(2)
    return head, entries


def main():
    posts = read_posts()
    chosen = choose(posts)
    if "--tabelle" in sys.argv:
        for p in posts:
            e = chosen[p["slug"]]
            print(p["date"], p["slug"][:48].ljust(48), e["thema"].ljust(10), e["banner"], ",".join(e.get("lesetipp", [])))
        return
    head, old = existing()
    keep = {} if "--alle" in sys.argv else old
    lines = [head.rstrip("\n") + "\n\n" + MARKER, "artikel:"]
    for p in posts:
        s = p["slug"]
        if s in keep:
            lines.append("  %s:\n%s" % (s, keep[s].rstrip("\n")))
            continue
        e = chosen[s]
        lines.append("  %s:" % s)
        lines.append("    banner: %s   # Thema: %s" % (e["banner"], e["thema"]))
        if e.get("lesetipp"):
            lines.append("    lesetipp: [%s]" % ", ".join(e["lesetipp"]))
    open(DATA, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("ok:", len(posts), "Artikel,", len(posts) - len(keep), "neu gewählt")


if __name__ == "__main__":
    main()
