# Datenschutz - Kurzinfo

Diese Datei ist eine kurze technische Übersicht zur App (kein Rechtsrat).

## Welche Daten die App verarbeitet
- Login/Auth ueber Firebase Auth.
- Profil-Daten ueber Firestore (z. B. displayName, bio, interests, avatarUrl).
- Inhalte ueber Vision API (z. B. projects, news, media, calendar).
- Rollen/Berechtigungen ueber API-Endpunkt `/me/authz`.

## Was gespeichert wird
- Lokale Einstellungen in `localStorage` (z. B. UI/Feature-Settings).
- Session/Auth-Daten gemäß Firebase-Mechanik.

## Wofür Daten genutzt werden
- Anmeldung und Account-Verwaltung.
- Anzeigen von Inhalten in der App.
- Prüfung von Berechtigungen für sichtbare Bereiche/Funktionen.
- Optional: Discord Presence (wenn im UI aktiviert).

## Datenweitergabe / Drittdienste
- Firebase (Auth + Firestore).
- Vision API (`api.vision-projects.eu`).
- Optional Modrinth API für Projekt-Metadaten.

## Sicherheit (technisch)
- Zugriff auf sensible API-Endpunkte nur mit Bearer-Token.
- Firestore-Zugriffe durch Security Rules eingeschränkt.
- Externe Links werden über sicheren Opener/Fallback geöffnet.

## Empfehlung
- Für rechtssichere Texte zusätzlich eine vollständige Datenschutzerklärung erstellen
  (Verantwortlicher, Rechtsgrundlagen, Speicherdauer, Betroffenenrechte, Kontakt).
