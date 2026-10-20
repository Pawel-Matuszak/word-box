# Word Box

An installable vocabulary trainer for English and Polish. The words live in a Google Sheet, an Apps Script web app serves them, and the frontend runs on GitHub Pages.

- **Study**: flip index cards in either direction. Spaced repetition uses Leitner boxes: New, Daily, 3 days, Weekly, 2 weeks, Monthly.
- **Quiz**: pick or type the translation. Typed answers that are only missing Polish letters, or have a small typo, count as "almost".
- **Words**: search, filter, add, edit and delete words. Changes are written back to the sheet.
- **Progress**: tracked per person in a `Progress` tab of the sheet.
- **Offline**: studying works offline. Answers queue up and upload when you're back online.

Stack: Vite, Preact, Tailwind CSS v4, vite-plugin-pwa and Google Apps Script.

## 1. Backend (Apps Script)

1. Open the spreadsheet, then go to **Extensions → Apps Script**.
2. Replace `Code.gs` with [`apps-script/Code.gs`](apps-script/Code.gs). In **Project Settings**, turn on *Show "appsscript.json"* and paste in [`apps-script/appsscript.json`](apps-script/appsscript.json).
3. Run `setup` once from the editor and grant access. It creates the `Progress` tab and a random `WRITE_KEY`, which it prints to the log. You can change the key under **Project Settings → Script properties**.
4. **Deploy → New deployment → Web app**, with *Execute as: Me* and *Who has access: Anyone*. Copy the URL that ends in `/exec`.

After changing `Code.gs`, use **Deploy → Manage deployments → Edit → New version**. That keeps the same URL.

The sheet's expected layout:

| Tab | Contents |
| --- | --- |
| `Main` | `id, word, translation, level, owner, notes, example_pl, example_en`. Columns are matched by header, so their order doesn't matter. |
| `Lists` | Levels in column A, people in column B |
| `Progress` | Created by `setup`. Don't edit it by hand. |

Anyone who has the URL can read the words. Changes to words and saved progress need the write key.

## 2. Frontend (GitHub Pages)

1. In the repo, go to **Settings → Pages** and set *Source* to **GitHub Actions**.
2. Go to **Settings → Secrets and variables → Actions → Variables** and add `VITE_API_URL` with the `/exec` URL.
3. Push to `main`. The workflow builds the app and deploys it to `https://<user>.github.io/word-box/`.

## Local development

```sh
npm install
cp .env.example .env.local   # set VITE_API_URL, or leave it empty to use demo data
npm run dev
```

`npm run icons` regenerates the PWA icons from `public/favicon.svg`.
