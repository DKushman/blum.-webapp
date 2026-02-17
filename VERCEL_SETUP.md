# Vercel Setup Anleitung

## 🚀 Option 1: Direkte Verbindung (EMPFOHLEN - Einfacher!)

Diese Methode ist am einfachsten - Vercel verbindet sich direkt mit GitHub.

### Schritt-für-Schritt:

1. **Gehe zu Vercel:**
   - Öffne [vercel.com](https://vercel.com)
   - Klicke auf "Sign Up" oder "Log In"
   - Wähle "Continue with GitHub"

2. **Verbinde dein GitHub Repository:**
   - Klicke auf "Add New Project"
   - Wähle dein GitHub Repository: `blume.-webapp`
   - Klicke auf "Import"

3. **Konfiguration:**
   - Framework Preset: **Next.js** (sollte automatisch erkannt werden)
   - Root Directory: `./` (Standard)
   - Build Command: `npm run build` (Standard)
   - Output Directory: `.next` (Standard)
   - Install Command: `npm install` (Standard)

4. **Deploy:**
   - Klicke auf "Deploy"
   - Fertig! 🎉

### Was passiert jetzt?

- ✅ Bei jedem Push zu `main` wird automatisch deployed
- ✅ Bei Pull Requests werden Preview-Deployments erstellt
- ✅ Deine App läuft auf `blume-webapp.vercel.app` (oder deinem Custom-Domain)
- ✅ Kostenlos für immer!

---

## 🔧 Option 2: Mit GitHub Actions (Erweitert)

Falls du mehr Kontrolle willst oder zusätzliche Build-Schritte brauchst.

### Schritt 1: Vercel Secrets in GitHub hinzufügen

1. **Gehe zu deinem GitHub Repository:**
   - Repository → Settings → Secrets and variables → Actions

2. **Erstelle Vercel Token:**
   - Gehe zu [Vercel Settings → Tokens](https://vercel.com/account/tokens)
   - Klicke "Create Token"
   - Kopiere den Token

3. **Füge Secrets in GitHub hinzu:**
   - `VERCEL_TOKEN`: Dein Vercel Token
   - `VERCEL_ORG_ID`: Findest du in Vercel Project Settings → General
   - `VERCEL_PROJECT_ID`: Findest du in Vercel Project Settings → General

### Schritt 2: Workflow ist bereits vorhanden

Der Workflow in `.github/workflows/deploy.yml` ist bereits konfiguriert!

### Schritt 3: Teste das Deployment

```bash
git add .
git commit -m "Setup Vercel deployment"
git push
```

Der GitHub Actions Workflow wird automatisch ausgeführt!

---

## 📝 Wichtige Hinweise

### Für private Apps (nur du):

1. **Vercel Dashboard:**
   - Gehe zu Project Settings → General
   - Unter "Visibility" kannst du die App privat machen

2. **Passwort-Schutz (optional):**
   - Vercel Pro Plan ($20/Monat) bietet Password Protection
   - Oder: Nutze Vercel's Edge Middleware für Basic Auth

### Local Storage:

- ✅ Funktioniert perfekt auf Vercel
- ✅ Daten werden im Browser gespeichert
- ✅ Funktioniert lokal und online gleich

### Umgebungsvariablen (falls nötig):

- Gehe zu Project Settings → Environment Variables
- Füge Variablen hinzu für Production, Preview, Development

---

## 🎯 Empfehlung

**Nutze Option 1 (Direkte Verbindung)** - es ist viel einfacher und macht genau dasselbe!

GitHub Actions ist nur nötig, wenn du:
- Custom Build-Schritte brauchst
- Mehr Kontrolle über den Deployment-Prozess willst
- Tests vor dem Deployment ausführen willst

---

## ✅ Checkliste

- [ ] Vercel Account erstellt
- [ ] GitHub Repository verbunden
- [ ] Erste Deployment erfolgreich
- [ ] App läuft auf `*.vercel.app`
- [ ] Automatisches Deployment bei Push funktioniert

---

## 🆘 Hilfe

- [Vercel Dokumentation](https://vercel.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Vercel Support](https://vercel.com/support)
