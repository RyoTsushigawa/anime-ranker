# Higher or Lower Ranker

Rescore an AniList (or MyAnimeList) list by comparing each show against one benchmark show per score,
from 10 down to 0.5 in half points. Runs entirely in the browser; no account or server needed.

## Files

| File | What it is |
|---|---|
| `index.html` | The whole app (HTML, CSS and JavaScript in one file) |
| `db.json` | Every anime on AniList: median score, titles, format, episodes, airing status, sequel/prequel links |
| `cover-urls.json` | AniList cover image addresses |
| `build-db.mjs` | Rebuilds `db.json` and `cover-urls.json` (`node build-db.mjs .`, about 20-30 minutes) |
| `.github/workflows/refresh-data.yml` | Runs that rebuild every Monday on GitHub and commits the result |

## Putting it online (GitHub Pages, free)

1. Create a GitHub account and a new **public** repository, for example `anime-ranker`.
2. Upload everything in this folder (including the `.github` folder) to the repository.
3. In the repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`.
4. After a minute the site is at `https://<your-github-name>.github.io/anime-ranker/`.
5. **Settings → Actions → General → Workflow permissions → Read and write**, so the weekly refresh can save new data.
   You can start a refresh by hand under **Actions → Refresh AniList data → Run workflow**.

## Trying it locally

Browsers block `fetch()` from `file://` pages, so open it through any small web server, for example
`npx serve .` in this folder, then visit the address it prints.

## Notes

- Progress, followed people and settings are stored in each visitor's browser (localStorage).
  "Back up progress" / "Restore progress" in the Export section move them between browsers.
- AniList allows about 30 requests a minute; the page spaces its requests and caches lists for 30 minutes.
- The import file is MyAnimeList XML, which AniList imports under Settings → Import Lists → MyAnimeList.
