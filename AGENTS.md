# Repository Guidelines

## Where issues and plans live

All of our own issues and plans are handled in **`sonorhq/sonor-src`** (private; the app's source, checked out at `~/src/sonor`). That includes the work on this website: screenshots, content, infrastructure and anything that spans the app and the site. Open new issues there, and look there first, closed issues included, before saying that no plan or issue exists:

```sh
gh issue list -R sonorhq/sonor-src --state all --search "<keywords>"
```

The two public repositories are where other people report things:

- `sonorhq/sonor.fi` (this repo): issues about the public website and the public API.
- `sonorhq/sonor`: issues about the app. It holds only the releases, not the source.

Read and answer the issues people open there, but track our own work in the private tracker. A pull request here links its issue as `sonorhq/sonor-src#N`.

The app repo also holds things this site depends on: the brand kit (`docs/brand/`), the capability code that the feature copy must match (`core/octo/provider.go`, `core/aurral/caps.go`), and the screenshot tooling.

## Everything else

`README.md` covers the layout, development commands, the website's design and brand rules, and the licence.
