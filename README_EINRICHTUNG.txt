FILAMENTVERWALTUNG – KOMPLETT AUF GITHUB
=======================================

Diese Version benötigt keinen eigenen Webserver und keine Datenbank.

AUFBAU
------
1. Öffentliches Repository für die Web-App:
   z. B. filamentverwaltung
   -> wird mit GitHub Pages veröffentlicht

2. Privates Repository für deine Daten:
   z. B. filament-data
   -> enthält filamente.json
   -> bleibt privat

Die App greift über die GitHub REST API auf das private Daten-Repository zu.

WICHTIG
-------
Das Zugriffstoken wird NICHT ins Repository und NICHT in den Quellcode geschrieben.
Du gibst es in der Web-App ein. Es wird nur im localStorage des jeweiligen Browsers
gespeichert.

Auf einem neuen Gerät musst du das Token einmal erneut hinterlegen.


SCHRITT 1 – APP-REPOSITORY ERSTELLEN
------------------------------------
1. GitHub öffnen und anmelden.
2. Neues Repository erstellen.
3. Name:
      filamentverwaltung
4. Sichtbarkeit:
      Public
   Bei GitHub Free benötigt GitHub Pages ein öffentliches Repository.
5. Repository erstellen.
6. Folgende Dateien aus diesem ZIP hochladen:
      index.html
      style.css
      app.js
      .nojekyll


SCHRITT 2 – GITHUB PAGES AKTIVIEREN
-----------------------------------
1. Im Repository "filamentverwaltung":
      Settings -> Pages
2. Unter "Build and deployment":
      Source: Deploy from a branch
3. Branch:
      main
      / (root)
4. Speichern.

GitHub zeigt anschliessend die Webadresse an, ungefähr:
   https://DEIN-BENUTZERNAME.github.io/filamentverwaltung/


SCHRITT 3 – PRIVATES DATEN-REPOSITORY
-------------------------------------
1. Neues Repository erstellen.
2. Name:
      filament-data
3. Sichtbarkeit:
      Private
4. README hinzufügen aktivieren.
5. Repository erstellen.

Du musst filamente.json NICHT selbst anlegen.
Die Web-App legt die Datei beim ersten Verbinden automatisch an.


SCHRITT 4 – FINE-GRAINED TOKEN ERSTELLEN
----------------------------------------
1. GitHub -> Profilbild -> Settings
2. Developer settings
3. Personal access tokens
4. Fine-grained tokens
5. Generate new token

Empfohlene Einstellungen:

Token name:
   Filamentverwaltung

Expiration:
   Nach deinem Wunsch.
   Bei Ablauf musst du ein neues Token in der App hinterlegen.

Repository access:
   Only select repositories

Repository auswählen:
   filament-data

Repository permissions:
   Contents -> Read and write

Weitere Berechtigungen braucht die App für den Datenbestand nicht.


SCHRITT 5 – APP VERBINDEN
-------------------------
1. Deine GitHub-Pages-Webadresse öffnen.
2. "GitHub-Verbindung" anklicken.
3. Eintragen:

GitHub-Benutzername:
   dein Benutzername

Daten-Repository:
   filament-data

Branch:
   main

Fine-grained Token:
   dein zuvor erzeugtes github_pat_... Token

4. "Verbindung testen".
5. "Speichern & verbinden".

Beim ersten Mal erzeugt die App automatisch:
   filamente.json


SICHERHEIT
----------
Das App-Repository ist öffentlich. Deshalb darf dort niemals das Token abgelegt werden.

Das Daten-Repository "filament-data" ist privat.

Das Fine-grained Token sollte ausschliesslich Zugriff auf "filament-data" bekommen
und dort nur:
   Contents: Read and write

Wenn du ein Gerät nicht mehr benutzt, kannst du in GitHub das Token jederzeit widerrufen.


MEHRERE GERÄTE
--------------
Auf jedem Gerät:
1. GitHub-Pages-Adresse öffnen.
2. GitHub-Verbindung hinterlegen.
3. Danach wird immer derselbe Datenbestand geladen.

Die App prüft beim Speichern, ob die Datei zwischenzeitlich auf einem anderen Gerät
geändert wurde. In diesem Fall wird nicht einfach überschrieben, sondern du wirst
aufgefordert, zuerst "Von GitHub neu laden" zu verwenden.


DATEIEN
-------
index.html     Web-App
style.css      Darstellung
app.js         Programmlogik und GitHub-Synchronisation
.nojekyll      verhindert unnötige Jekyll-Verarbeitung durch GitHub Pages
README.txt     diese Anleitung


NEU: 5-Sterne-Bewertung pro Filament. Die Bewertung wird in filamente.json gespeichert und ist sortierbar.


NEU IN VERSION 7: DRUCKKOSTEN-RECHNER
-------------------------------------
- Bis zu 8 Filamente aus dem Lagerbestand
- Materialkosten anhand Preis pro kg und Verbrauch in Gramm
- Maschinenzeit, Standard CHF 2.00/h
- Arbeitszeit, Standard CHF 50.00/h
- Nebenkosten pauschal CHF 2.00
- Strompreis Standard CHF 0.277/kWh
- Druckerverbrauch Standard 0.20 kWh/h
- Gewinnmarge Standard 10 %
- Alle Ansätze im Rechner editierbar


NEU IN VERSION 8
----------------
- Zwei Hauptreiter: Verwaltung und Druckkosten
- Druckkosten-Rechner optisch an die Verwaltung angepasst
- Kompaktere Filamentzeilen und Kartenlayout
- Kostenübersicht hervorgehoben
- Rechner kann zurückgesetzt werden
- Zuletzt geöffneter Reiter wird im Browser gespeichert


VERSION 10 – RECHNUNGEN
-----------------------
Dritter Reiter mit Kunden, Rechnungspositionen, Entwürfen, Nummerierung
JJJJ-NNNN, Status und PDF inklusive QR-Zahlteil. Die Rechnungen liegen
in der privaten Datei rechnungen.json, Filamente bleiben in filamente.json.

Absender und IBAN im Reiter Rechnungen hinterlegen (lokal gespeichert).
Bei Ausstellung werden die Absenderdaten als Momentaufnahme in die Rechnung
übernommen. Der Token wird weiterhin pro Browser eingerichtet.

Für PDF und QR-Code werden jsPDF und qrcode-generator über CDN geladen;
Internetverbindung ist dafür nötig.

WICHTIG: Vor produktivem Versand die QR-Rechnung und die Abmessungen des
Zahlteils mit einem geeigneten QR-Rechnungsvalidator / Bank prüfen.
Diese Version ist ein Prototyp, keine zertifizierte Fakturierungssoftware.
Rechnungen sind ohne MWST-Ausweis; steuerliche Anforderungen selbst prüfen.

Version 12: qr-local.js zusätzlich hochladen. PDF über Browser-Druckdialog «Als PDF speichern». Keine externen Bibliotheken erforderlich.
