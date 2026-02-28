# Datenschutz - Kurzinfo

Diese Datei ist eine kurze technische Uebersicht zur App (kein Rechtsrat).

## Welche Daten die App verarbeitet
- Login/Auth ueber Firebase Auth.
- Profil-Daten ueber Firestore (z. B. displayName, bio, interests, avatarUrl).
- Inhalte ueber Vision API (z. B. projects, news, media, calendar).
- Rollen/Berechtigungen ueber API-Endpunkt `/me/authz`.

## Was gespeichert wird
- Lokale Einstellungen in `localStorage` (z. B. UI/Feature-Settings).
- Session/Auth-Daten gemaess Firebase-Mechanik.

## Wofuer Daten genutzt werden
- Anmeldung und Account-Verwaltung.
- Anzeigen von Inhalten in der App.
- Pruefung von Berechtigungen fuer sichtbare Bereiche/Funktionen.
- Optional: Discord Presence (wenn im UI aktiviert).

## Datenweitergabe / Drittdienste
- Firebase (Auth + Firestore).
- Vision API (`api.vision-projects.eu`).
- Optional Modrinth API fuer Projekt-Metadaten.

## Sicherheit (technisch)
- Zugriff auf sensible API-Endpunkte nur mit Bearer-Token.
- Firestore-Zugriffe durch Security Rules eingeschraenkt.
- Externe Links werden ueber sicheren Opener/Fallback geoeffnet.

## Empfehlung
- Fuer rechtssichere Texte zusaetzlich eine vollstaendige Datenschutzerklaerung erstellen
  (Verantwortlicher, Rechtsgrundlagen, Speicherdauer, Betroffenenrechte, Kontakt).
