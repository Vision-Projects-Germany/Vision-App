# Datenschutz-Gutachten Vision App

Diese Datei ist eine technische Datenschutz-Auswertung auf Basis der aktuellen Codebasis von `Vision Desktop`. Sie ist kein Rechtsrat, sondern ein belastbarer Input fuer eine spaetere KI-gestuetzte Datenschutzerklaerung.

## Systemrolle fuer spaetere KI

Du bist die `Vision App` bzw. `Vision Desktop`, eine Desktop-Anwendung auf Basis von `Tauri`, `React`, `TypeScript` und `Firebase`. Du nutzt webbasierte Dienste und APIs, bist aber keine rein statische Website. Wenn du spaeter eine Datenschutzerklaerung erzeugst, behandle die folgenden Punkte als technische Tatsachengrundlage.

## 1. Technische Einordnung

- Die Anwendung ist eine Desktop-App mit Weboberflaeche in Tauri.
- Sie kommuniziert aktiv mit externen Diensten ueber HTTPS.
- Sie verarbeitet sowohl lokale Geraetedaten als auch serverseitige Konten-, Profil-, Projekt- und Berechtigungsdaten.
- Teile der Funktionen sind nur fuer Moderatoren oder Administratoren sichtbar und aktiv.

## 2. Nachweislich genutzte externe Dienste

### 2.1 Firebase / Google

Die App initialisiert:

- `Firebase Auth`
- `Cloud Firestore`
- `Firebase Analytics`, falls im Laufzeitsystem unterstuetzt

Technische Nachweise:

- [src/firebase.ts](/e:/Vision Projects/Developer/Desktop-App/src/firebase.ts#L1)

Praktische Bedeutung:

- Anmeldung von Nutzern ueber Firebase
- Abruf und Bearbeitung von Profildaten in Firestore
- moegliche Nutzungs- oder Ereignismessung ueber Firebase Analytics

### 2.2 Vision-eigene API

Die App nutzt umfangreich die Domain `https://api.vision-projects.eu` fuer operative Funktionen, darunter:

- Profilverwaltung
- Projekte
- News
- Medienverwaltung
- Rollen und Berechtigungen
- Mitgliederverwaltung
- Bewerbungen
- Kalender
- System-Health

Technische Nachweise:

- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L255)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L3391)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L3897)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L4626)
- [src/features/profile/ProfilePage.tsx](/e:/Vision Projects/Developer/Desktop-App/src/features/profile/ProfilePage.tsx#L456)

### 2.3 GitHub Releases fuer Updates

Die Auto-Update-Funktion ist auf GitHub Releases konfiguriert.

Technische Nachweise:

- [src-tauri/tauri.conf.json](/e:/Vision Projects/Developer/Desktop-App/src-tauri/tauri.conf.json#L35)
- [src-tauri/src/lib.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/lib.rs#L224)

Praktische Bedeutung:

- Beim Update-Check werden Verbindungen zu GitHub aufgebaut.
- Dabei koennen typischerweise IP-Adresse, Zeitpunkt, Client-Metadaten und Abruf-Logs bei GitHub anfallen.

### 2.4 Discord Rich Presence

Die App kann optional den aktuellen Status an einen lokal vorhandenen Discord-Client uebergeben.

Technische Nachweise:

- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L2952)
- [src-tauri/src/lib.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/lib.rs#L58)

Praktische Bedeutung:

- Es koennen Statusinformationen wie Aktivitaet, Bilder, Zeitstempel und Join-Informationen an Discord RPC uebermittelt werden.
- Diese Funktion ist in den App-Einstellungen aktivierbar/deaktivierbar.

### 2.5 Weitere externe Quellen

Aus dem Code ersichtlich sind zusaetzlich:

- `modrinth.com` und `api.modrinth.com` fuer Projekt-/Community-Daten
- `launchermeta.mojang.com` fuer Minecraft-Versionen
- `www.google.com/generate_204` fuer einen Erreichbarkeits-/Online-Check

Technische Nachweise:

- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L1013)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L1204)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L2094)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L2590)

## 3. Kategorien verarbeiteter personenbezogener Daten

### 3.1 Konto- und Anmeldedaten

Gesichert aus dem Code ableitbar:

- E-Mail-Adresse
- Passwort im Login-Vorgang
- Firebase-UID
- ID-Token / Bearer-Token
- Authentifizierungsstatus

Technische Nachweise:

- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L3932)
- [src-tauri/src/auth/mod.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/auth/mod.rs#L74)

Einordnung:

- Das Passwort wird beim Login ueber Firebase verarbeitet.
- Zugriffstoken und Refresh-Token werden fuer API- oder OAuth-Zugriffe verarbeitet.

### 3.2 Profil- und Mitgliedsdaten

In der Profilfunktion sind unter anderem vorgesehen oder verarbeitet:

- `uid`
- `username`
- `displayName`
- `age`
- `email`
- `photoURL` / Avatar
- `bio`
- `minecraftName`
- `roles`
- `level`, `xp`, Aktivitaets-/Statistikwerte
- Projektzuordnungen
- soziale Links wie Discord, GitHub, Twitter, Website, YouTube, Twitch

Technische Nachweise:

- [src/features/profile/types.ts](/e:/Vision Projects/Developer/Desktop-App/src/features/profile/types.ts#L1)
- [src/features/profile/ProfilePage.tsx](/e:/Vision Projects/Developer/Desktop-App/src/features/profile/ProfilePage.tsx#L200)
- [src/features/profile/ProfilePage.tsx](/e:/Vision Projects/Developer/Desktop-App/src/features/profile/ProfilePage.tsx#L488)

### 3.3 Rollen-, Rechte- und Organisationsdaten

Die App verarbeitet:

- Rollen
- Berechtigungen
- Projektmitgliedschaften
- Moderations- und Admin-Status
- Bewerbungsstatus

Technische Nachweise:

- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L3362)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L4622)

### 3.4 Medien- und Upload-Daten

Die App kann Dateien hochladen oder referenzieren, insbesondere:

- Avatare
- Logos
- Banner
- News-Cover
- sonstige Mediendateien

Technische Nachweise:

- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L1268)
- [src/features/profile/components/ProfileAvatar.tsx](/e:/Vision Projects/Developer/Desktop-App/src/features/profile/components/ProfileAvatar.tsx#L39)

Einordnung:

- Lokal ausgewaehlte Dateien koennen in die App eingelesen und an Server-Endpunkte uebertragen werden.

### 3.5 Nutzungs- und Telemetriedaten

Technisch erkennbar:

- Firebase Analytics kann aktiviert werden, wenn die Plattform dies unterstuetzt.
- Update-Abfragen erzeugen Netzwerkzugriffe.
- Online-/Health-Pruefungen erzeugen Netzwerkzugriffe.
- Discord Presence uebermittelt Aktivitaetsstatus.

Technische Nachweise:

- [src/firebase.ts](/e:/Vision Projects/Developer/Desktop-App/src/firebase.ts#L21)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L2589)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L2954)

## 4. Lokale Speicherung auf dem Geraet

### 4.1 Browser-/WebView-Speicher

Im lokalen `localStorage` werden mindestens folgende Werte abgelegt:

- App-Einstellungen unter `vision.desktop.settings.v1`
- Berechtigungs-Cache unter `vision.authz.cache.v1`
- Theme-Einstellung unter `vision-theme`
- projektbezogene Cache-Daten, mindestens als `vision.projects.cache.v3`

Technische Nachweise:

- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L235)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L961)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L1551)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L2525)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L3362)
- [src/shared/theme/themeStore.ts](/e:/Vision Projects/Developer/Desktop-App/src/shared/theme/themeStore.ts#L12)

### 4.2 Native Auth-Speicherung

Fuer OAuth-Tokens gilt laut Code:

- primaer Speicherung im System-Keychain / Keyring
- falls nicht verfuegbar: Fallback in eine lokale Tauri-Store-Datei `auth.json`

Zusatzdaten:

- gespeicherte OAuth-Provider-Konfiguration
- Pending-Login-Status

Technische Nachweise:

- [src-tauri/src/auth/mod.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/auth/mod.rs#L16)
- [src-tauri/src/auth/mod.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/auth/mod.rs#L119)
- [src-tauri/src/auth/mod.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/auth/mod.rs#L516)
- [src-tauri/src/auth/mod.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/auth/mod.rs#L530)

Bewertung:

- Positiv ist die bevorzugte Nutzung des System-Keyrings.
- Datenschutzrelevant ist der Fallback in `auth.json`, weil dort Token lokal dateibasiert gespeichert werden koennen, falls kein Keychain-Zugriff moeglich ist.

## 5. Zwecke der Verarbeitung

Nach aktuellem Code lassen sich diese Hauptzwecke sicher annehmen:

- Nutzeranmeldung und Sitzungsverwaltung
- Anzeige und Bearbeitung von Nutzerprofilen
- Verwaltung von Projekten und Projektmitgliedschaften
- Rollen- und Rechtepruefung
- News-, Medien- und Inhaltsverwaltung
- Bearbeitung von Bewerbungen
- Anzeige von Kalender-, Dashboard- und Analyseinhalten
- Bereitstellung von App-Updates
- optionale Anzeige des App-Status in Discord
- Stabilitaets- und Erreichbarkeitspruefungen von Diensten

## 6. Empfaenger und Drittanbieter

Technisch identifizierbare Empfaenger bzw. externe Stellen:

- Google / Firebase
- Vision Projects API unter `api.vision-projects.eu`
- GitHub Releases
- Discord, sofern Rich Presence aktiviert ist
- Modrinth
- Mojang
- Google fuer den `generate_204`-Reachability-Check

## 7. Sicherheits- und Datenschutzbeobachtungen

### Positive Punkte

- Bearer-Token werden fuer geschuetzte API-Endpunkte eingesetzt.
- OAuth mit `state`, `PKCE` und Token-Refresh ist implementiert.
- Externe Links werden ueber Tauri Opener bzw. sicheren Browser-Open-Fallback geoeffnet.
- Tokens sollen bevorzugt nicht im normalen Web-Speicher liegen.

Technische Nachweise:

- [src-tauri/src/auth/mod.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/auth/mod.rs#L120)
- [src-tauri/src/lib.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/lib.rs#L195)

### Datenschutzrelevante Risiken oder offene Punkte

- `Firebase Analytics` wird technisch initialisiert; aus dem Code allein ist keine Consent-Logik oder Opt-in-Abfrage erkennbar.
- In Tauri ist `csp` aktuell auf `null` gesetzt.
- Die App enthaelt einen generischen nativen `http_request`-Befehl, der beliebige externe Requests ausfuehren kann.
- Ein Online-Check gegen `https://www.google.com/generate_204` fuehrt zu einem zusaetzlichen Drittland-Kontakt.
- Falls Keychain nicht verfuegbar ist, koennen OAuth-Tokens dateibasiert lokal gespeichert werden.

Technische Nachweise:

- [src/firebase.ts](/e:/Vision Projects/Developer/Desktop-App/src/firebase.ts#L21)
- [src-tauri/tauri.conf.json](/e:/Vision Projects/Developer/Desktop-App/src-tauri/tauri.conf.json#L22)
- [src-tauri/src/lib.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/lib.rs#L160)
- [src/App.tsx](/e:/Vision Projects/Developer/Desktop-App/src/App.tsx#L2590)
- [src-tauri/src/auth/mod.rs](/e:/Vision Projects/Developer/Desktop-App/src-tauri/src/auth/mod.rs#L541)

## 8. Was fuer eine spaetere Datenschutzerklaerung noch fehlt

Folgende Punkte sind technisch nicht vollstaendig aus der Codebasis ableitbar und muessen rechtlich/fachlich ergaenzt werden:

- Name und Kontaktdaten des Verantwortlichen
- ggf. Datenschutzbeauftragter
- konkrete Rechtsgrundlagen je Verarbeitung
- genaue Speicherdauern
- Loeschkonzepte
- Vertraege zur Auftragsverarbeitung
- konkrete Hosting-Standorte und Drittlandtransfers
- genaue Beschreibung, ob Firebase Analytics nur mit Einwilligung aktiviert wird
- genaue Empfaengerlisten fuer Admin-/Moderationsdaten

## 9. Kompakte KI-Zusammenfassung

```text
Produkt: Vision Desktop / Vision App
Typ: Tauri-Desktop-App mit React-Frontend

Externe Dienste:
- Firebase Auth
- Firestore
- Firebase Analytics (wenn supported)
- Vision API: api.vision-projects.eu
- GitHub Releases Updater
- Discord Rich Presence (optional)
- Modrinth API
- Mojang Launcher Meta
- Google generate_204

Personenbezogene Daten:
- Login-Daten: E-Mail, Passwort im Login-Vorgang, UID, Token
- Profildaten: Anzeigename, Username, Alter, E-Mail, Bio, Avatar, Minecraft-Name, Erfahrung, Interessen
- Community-/Social-Daten: Discord, GitHub, Twitter, Website, YouTube, Twitch
- Organisationsdaten: Rollen, Berechtigungen, Projektmitgliedschaften, Bewerbungen, Moderationsstatus
- Medien: hochgeladene Bilder/Dateien
- Nutzungs-/Metadaten: Analytics, Update-Checks, Online-Checks, Discord Presence

Lokale Speicherung:
- localStorage: Einstellungen, Theme, Authz-Cache, Projekt-Cache
- System-Keychain fuer OAuth-Tokens
- Fallback: auth.json via Tauri Store

Zwecke:
- Authentifizierung
- Profilverwaltung
- Projekt- und Rollenverwaltung
- News-/Media-/Admin-Funktionen
- Update-Auslieferung
- optionale Discord-Statusanzeige

Offene Rechtsfragen:
- Verantwortlicher
- Rechtsgrundlagen
- Speicherdauer
- AV-Vertraege
- Drittlandtransfer
- Consent fuer Analytics
```

## 10. Fazit

Die Vision App verarbeitet nicht nur einfache Oberflaechendaten, sondern klar personenbezogene Konto-, Profil-, Rollen- und Organisationsdaten. Dazu kommen optionale Telemetrie- und Statusfunktionen sowie mehrere externe Dienstleister. Fuer eine spaetere Datenschutzerklaerung sollte deshalb zwischen Pflichtverarbeitungen, optionalen Funktionen und reinen Administrationsfunktionen sauber getrennt werden.
