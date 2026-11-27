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

## Releases

Open a PR against `main` to run **Verify PR**. Branches in this repository also get a public Firebase Hosting preview. New commits update the same URL in the PR comment, and the preview expires seven days after the last deployment. Merging to `main` rebuilds and publishes production on `retireplan-vibe`. The production job summary records the deployed commit and previous Hosting version.

### One-time deployment setup

1. Set up a separate Spark Firebase project for prelive. Register a web app in each project and enable its Firebase Hosting site. For saved sets, enable Google as the Auth provider and provision a Standard Firestore database in each project that needs one. Use the existing public RetirePlan support contact.
2. Set the repository Actions variables below. The web config variables contain the public JSON client config from Firebase Project Settings. The deploy jobs authenticate through [Google Workload Identity Federation](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines).

   | Variable | Value |
   | --- | --- |
   | `PRELIVE_FIREBASE_PROJECT_ID` | The separate prelive project ID |
   | `PRELIVE_FIREBASE_WEB_CONFIG` | The prelive web app config |
   | `PRODUCTION_FIREBASE_WEB_CONFIG` | The `retireplan-vibe` web app config |
   | `PRELIVE_HOSTING_IDENTITY_PROVIDER` / `PRELIVE_HOSTING_SERVICE_ACCOUNT` | Prelive Hosting deploy identity with Firebase Auth configuration access for channel domains |
   | `PRODUCTION_IDENTITY_PROVIDER` / `PRODUCTION_DEPLOY_SERVICE_ACCOUNT` | Production identity with Hosting and Firestore rules deploy access |
   | `PRELIVE_RULES_IDENTITY_PROVIDER` / `PRELIVE_RULES_SERVICE_ACCOUNT` | Prelive identity with Firestore rules deploy access |

3. Restrict federation to this repository's numeric ID and the relevant workflow. The prelive Hosting identity is for `pull_request` runs of `prelive.yml`. The production and prelive rules identities are for `push` runs of `production.yml` on `refs/heads/main`.
4. In GitHub, require a pull request and the **Verify PR** status check for `main`. Confirm the check has run before making it required.

Use disposable plans on the prelive site. Previews share the reviewed prelive rules, while the verification job tests each PR's proposed rules in the emulator. Reviewed rules reach production before the website update and sync to prelive after release. Before the first saved-sets release, seed the tested rules in prelive to enable hosted testing. Use the previous Hosting version from the production job summary if a Hosting rollback is needed.
