# GitHub Actions Deployment

Dieses Repository enthält GitHub Actions Workflows für automatisches Deployment.

## Verfügbare Workflows

### 1. Vercel Deployment (`deploy.yml`)
**Empfohlen für Next.js Apps**

#### Setup:
1. Gehe zu [Vercel Dashboard](https://vercel.com/dashboard)
2. Erstelle ein neues Projekt oder verbinde dein GitHub Repository
3. Gehe zu Project Settings → General
4. Kopiere die folgenden Werte:
   - **Vercel Token**: Settings → Tokens → Create Token
   - **Org ID**: Aus der URL oder Project Settings
   - **Project ID**: Aus Project Settings → General

5. Füge diese als Secrets in GitHub hinzu:
   - Gehe zu deinem GitHub Repository → Settings → Secrets and variables → Actions
   - Füge hinzu:
     - `VERCEL_TOKEN`: Dein Vercel Token
     - `VERCEL_ORG_ID`: Deine Vercel Org ID
     - `VERCEL_PROJECT_ID`: Deine Vercel Project ID

#### Aktivierung:
- Der Workflow läuft automatisch bei jedem Push zu `main`
- Bei Pull Requests wird nur gebaut, nicht deployed

---

### 2. Netlify Deployment (`deploy-netlify.yml`)
**Alternative zu Vercel**

#### Setup:
1. Gehe zu [Netlify Dashboard](https://app.netlify.com)
2. Erstelle ein neues Site oder verbinde dein GitHub Repository
3. Gehe zu Site Settings → Build & deploy
4. Kopiere die **Site ID**

5. Erstelle ein Access Token:
   - User Settings → Applications → New access token

6. Füge diese als Secrets in GitHub hinzu:
   - `NETLIFY_AUTH_TOKEN`: Dein Netlify Access Token
   - `NETLIFY_SITE_ID`: Deine Netlify Site ID

---

## Workflow aktivieren

1. **Wähle einen Workflow aus** (Vercel oder Netlify)
2. **Lösche den anderen Workflow**, wenn du ihn nicht brauchst
3. **Füge die Secrets in GitHub hinzu** (siehe Setup-Anleitung oben)
4. **Commite und pushe** die Workflow-Datei zu deinem Repository
5. **Teste** mit einem Push zu `main`

## Umgebungsvariablen

Falls deine App Umgebungsvariablen benötigt:
- **Vercel**: Füge sie im Vercel Dashboard hinzu (Project Settings → Environment Variables)
- **Netlify**: Füge sie im Netlify Dashboard hinzu (Site Settings → Environment variables)
- Oder füge sie direkt im Workflow unter `env:` hinzu

## Troubleshooting

- **Build fehlgeschlagen?** Prüfe die Logs im GitHub Actions Tab
- **Deployment fehlgeschlagen?** Stelle sicher, dass alle Secrets korrekt gesetzt sind
- **Umgebungsvariablen fehlen?** Füge sie im entsprechenden Dashboard hinzu
