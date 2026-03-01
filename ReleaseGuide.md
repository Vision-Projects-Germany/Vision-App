# 🚀 Tauri Release + GitHub Actions + Auto-Updater

## ✅ Voraussetzungen (einmalig)
- `src-tauri/tauri.conf.json`
  - `"bundle.createUpdaterArtifacts": true`
  - `"plugins.updater.pubkey"` = dein Public Key
  - `"version": "X.Y.Z"`
- GitHub Secrets gesetzt:
  - `TAURI_PRIVATE_KEY`
  - `TAURI_KEY_PASSWORD` (falls Passwort gesetzt)
- Workflow-Datei:
  - `.github/workflows/tauri-build.yml`

---

# 🔄 Neues Release bauen

## 1) Version erhöhen
In `src-tauri/tauri.conf.json`:
```json
"version": "0.1.5"
```

---

## 2) Commit + Push
```bash
git add .
git commit -m "release: v0.1.6"
git push
```

---

## 3) Release-Tag erstellen
```bash
git tag v0.1.6
```

---

## 4) Tag pushen (STARTET DEN BUILD)
```bash
git push origin v0.1.6
```

---

# 🔍 Build prüfen
GitHub → Repo → Actions  
oder  
GitHub → Repo → Releases

Im Release müssen sein:
- `latest.json`
- `.sig` Dateien
- Updater Bundles (.zip / .tar.gz)

---

# 🗑️ Tag löschen (falls nötig)

## Lokal:
```bash
git tag -d v0.1.2
```

## Remote:
```bash
git push origin --delete v0.1.2
```

---

# 🧠 Wichtig

| Befehl | Startet Build? |
|--------|---------------|
| git push | ❌ |
| git commit | ❌ |
| git tag vX.Y.Z | ❌ |
| git push origin vX.Y.Z | ✅ |

---

# 🏁 Release Ablauf (Kurzfassung)

1. Version erhöhen  
2. `git commit`  
3. `git push`  
4. `git tag vX.Y.Z`  
5. `git push origin vX.Y.Z`