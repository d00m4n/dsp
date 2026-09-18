# Bundled wallpapers

This directory can hold wallpaper images that ship with a given deployment
of homebase, listed in `index.json` so the settings panel's "Deployed
wallpapers" picker can offer them. `index.json` currently contains an
empty array (`[]`): **no wallpaper images are bundled with this repository
at this time.**

This is intentional, not an oversight — nothing here should be treated as
a placeholder to fill in without doing the following first.

## Adding a wallpaper

Before adding any image file to this directory and referencing it from
`index.json`, add an entry below recording:

- **File name** — the exact file placed in this directory.
- **Source URL** — where the image was obtained from.
- **Author** — the creator's name or handle, as credited at the source.
- **License** — the exact license the image is distributed under (e.g.
  `CC0`, `CC-BY-4.0`, `MIT`), and a link to its full text if it isn't a
  well-known SPDX identifier.

Only add images whose license explicitly permits redistribution as part
of this repository. If a license is unclear or requires attribution terms
this project can't satisfy (e.g. non-commercial-only clauses, unclear
provenance), don't add the image — link to it from documentation instead
of bundling it.

Once an entry exists here for a file, add its filename as a string to the
`index.json` array (see the wallpaper-loading code in
`src/lib/components/settings/AppearanceSection.svelte` for the expected
shape) so it appears in the deployed-wallpapers picker.

## Wallpaper registry

| File | Source URL | Author | License |
| ---- | ---------- | ------ | ------- |
| `nature.jpg` | [Unsplash](https://unsplash.com/es/fotos/reflejo-de-la-montana-en-el-cuerpo-de-agua-DlkF4-dbCOU) | [Garrett Parker](https://unsplash.com/es/@garrettpsystems) | [Unsplash License](https://unsplash.com/license) |
