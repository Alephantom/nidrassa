# Nidrassa Website

The website for **nidrassa.com**: meditation, breathing, journaling and small breaks for women with full days.
Built with [Jekyll](https://jekyllrb.com) (static site, no database). Language: German (du).

---

## Pages

| Address | File | Content |
|---|---|---|
| `/` | `index.html` | Home: hero, pain point, 2-5-15 method with random practice + timer, Warum Meditation, Über Nidrassa, newsletter, latest 3 posts |
| `/uebungen/` | `uebungen.html` | All companion practices by format (from `_data/`) |
| `/blog/` | `blog.html` | Latest 3 posts, all posts with topic filter, 12 at a time |
| `/blog/<slug>/` | `_posts/*.md` | Blog articles (layout `_layouts/post.html`) |
| `/shop/` | `shop.html` | Card deck "Eine Frage weiter" (pre-order) + GoFundMe fundraiser |
| `/retreat/` | `retreat.html` | Public retreat page for now: hero + waitlist only (blue theme) |
| `/retreat1/` | `retreat1.html` | **Hidden** full retreat one-pager (not linked, not in sitemap, `noindex`): Retreats · Ablauf · Ort · Warteliste · Stimmen, with section navigation |
| `/impressum/`, `/datenschutz/` | `impressum.html`, `datenschutz.html` | Legal pages (**templates: fill in the highlighted placeholders**) |
| `/fast-geschafft/` | `fast-geschafft.html` | Shown after the newsletter form is sent ("Fast geschafft", check your inbox), `noindex`, not in sitemap. Set `https://nidrassa.com/fast-geschafft/` as the page after submitting in the newsletter tool |
| `/danke/` | `danke.html` | Shown after the click on the confirmation link ("Willkommen beim Sunday Reset"), `noindex`, not in sitemap. YouTube link of the candle video goes in `video_url` in its front matter. Set `https://nidrassa.com/danke/` as the page after confirming in the newsletter tool |
| `/newsletter/` | `newsletter.html` | Newsletter sign-up page (link for Instagram etc.). The form itself is `_includes/newsletter.html`, also used on the home page |
| `/opt-in/` | `opt-in.html` | Old address, forwards to `/danke/` |
| `/404.html` | `404.html` | "Seite nicht gefunden" |

## Folder structure

```
_config.yml            Site settings (domain, blog addresses, plugins)
_layouts/default.html  Frame for every page: <head>, navigation, footer, script
_layouts/post.html     Blog article (reading time, call-to-action box, related posts)
_includes/             head, header (navigation), subnav (section navigation), footer, star-sprite (logo star), post-card
_data/navigation.yml   Links in the navigation and footer
_data/formats.yml      The 5 formats (Meditation, Atmung, Journaling, Dehnen, Im Alltag):
                       names, intro text, photo. Also used as blog topics.
_data/practices.yml    All companion practices (title, minutes, steps)
_posts/                Blog articles (Markdown)
assets/styles.css      All styles (table of contents at the top)
assets/site.js         Interaction only (burger menu, 2-5-15 picker, blog filter, gallery, forms)
assets/fonts/          Brand fonts, self-hosted (Marcellus, Cormorant Garamond, Jost + licences)
assets/*.webp|svg      Photos, logo, favicon
CNAME                  Custom domain for GitHub Pages (nidrassa.com)
.github/workflows/     Daily build + deploy to GitHub Pages
```

## Page front matter

Every page starts with a front matter block, e.g.:

```yaml
---
layout: default
title: "Shop"                      # browser tab + Google title ("Shop | Nidrassa")
description: "…"                   # Google snippet, 140–160 characters
image: /assets/shop-flatlay.webp   # preview image for Pinterest/Facebook (optional)
nav: shop                          # highlights the navigation link (uebungen | blog | retreat | shop)
permalink: /shop/
body_class: theme-blue             # optional: blue retreat colours
footer: false                      # optional: hide footer
subnav:                            # optional: second navigation for a one-pager
  - title: Ablauf
    id: ablauf                     # id of the <section> on the page
  - title: Warteliste
    id: warteliste
    cta: true                      # shown as the solid button
---
```

## Common tasks

### Write a new blog article
Create `_posts/JJJJ-MM-TT-slug.md` (the slug becomes the address `/blog/slug/`):

```yaml
---
title: "Atemübung zum Einschlafen: ruhig werden in fünf Minuten"
description: "140–158 characters, contains the main keyword."
date: 2026-10-27 07:00:00 +0100
topic: atmung              # meditation | atmung | journaling | dehnen | alltag
keywords: [Atemübung zum Einschlafen, …]
image: /assets/sunset-mudra.webp
image_alt: "Describe the photo"
lead: "1–3 sentences shown under the title."
cta:                        # dark box at the end of the article
  title: "Weiter atmen"
  text: "Noch mehr kurze Atemübungen für zwischendurch."
  url: /uebungen/#fmt-atmung
  label: "Zu den Atemübungen"
---

Text in Markdown. ## for subheadings, 1. for steps, > for a quote.
A tinted note box: write the paragraph, then `{: .note}` on the next line.
```

Articles with a **future date** stay hidden until that day (see "Scheduled posts").
The publishing calendar is in `../Redaktionsplan-Blog.md`.

### Add or change a practice
Edit `_data/practices.yml`. `minutes` must be 2, 5 or 15 so the 2-5-15 picker on the home page finds it.
The practices page and the counters update automatically.

### Change navigation or footer links
Edit `_data/navigation.yml`.

### Retreat pages
To go live with the full version: move the content of `retreat1.html` into `retreat.html` (keep `permalink: /retreat/`) and delete `retreat1.html`, or remove `noindex`/`sitemap: false` there and link it.

#### Sections of the full version
The full retreat page (`retreat1.html`, hidden at `/retreat1/`) has a second navigation, defined in its front matter (`subnav`).
On desktop it sits as a narrower bar behind the main navigation; on phones it replaces it
(back button to the home page, Warteliste button, menu with all sections plus Startseite and Shop).
To add a section: add a `<section class="rt-section" id="…">` and a matching `subnav` entry.
Still placeholders: the schedule is an example, the venue has no photos yet, "Stimmen" waits for real reviews
after the first retreat (never publish invented reviews).

### Change shop photos
Edit the `gallery` list in the front matter of `shop.html`.

## Settings that still need real values

| What | Where |
|---|---|
| Checkout link for the pre-order button | `CONFIG.preorderUrl` at the top of `assets/site.js` |
| Retreat waitlist endpoint | `CONFIG.waitlistUrl` |
| Name, address, providers | placeholders in `impressum.html` and `datenschutz.html` |

While an endpoint is empty, the forms send **nothing** but still show the thank-you note (for testing).
The pre-order button shows "Vorbestellung öffnet bald" until a checkout link is set.
The gift-wrap checkbox is only visual until the checkout can receive it.

## Privacy notes
- Fonts are served from this site (no Google Fonts).
- The GoFundMe widget loads only after a click on "Fundraiser anzeigen".
- No tracking or analytics cookies.

## Scheduled posts and deployment
`future: false` in `_config.yml` means posts appear on their date only after a new build.
`.github/workflows/pages.yml` builds the site on every push **and every morning at 05:00 UTC**
and publishes it to GitHub Pages. This assumes the `Website` folder is the root of the Git repository.
In the repository settings: *Pages → Source: GitHub Actions*, custom domain `nidrassa.com`, "Enforce HTTPS".

## Run locally

```bash
bundle install
bundle exec jekyll serve            # only published posts, http://localhost:4000
bundle exec jekyll serve --future   # preview all scheduled posts
```

If `bundle install` fails at `eventmachine` on a Mac, the Xcode Command Line Tools are missing their
C++ headers. Reinstall them (needs your password):
`sudo rm -rf /Library/Developer/CommandLineTools && xcode-select --install`

## Brand
Colours, logo files and style guide: `../Nidrassa_Brand/`.
Green (olive star) = home and shop, blue = retreats. Page background = paper `#ECE2D2`.
