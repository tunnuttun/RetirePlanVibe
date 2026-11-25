<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# RetirePlan

RetirePlan projects retirement income, expenses, assets, and debt in USD or THB. Plans are saved in the current browser and can be exported or imported as JSON. The dashboard shows projected balances at the end of each age's year.

## Run locally

Use Node.js 22 or 24.

```sh
npm ci
npm run dev
```

## Deploy to Firebase Hosting

```sh
npm ci
npm run build
npx -y firebase-tools@latest deploy --only hosting
```
