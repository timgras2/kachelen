# Stookmelding NL (MVP)

Eenvoudige PWA voor persoonlijk stookadvies per uur in Nederland.

## Functies
- Groen/Rood advies op basis van locatie (GPS), luchtkwaliteit en wind.
- Interne Stookwijzer-code per uur: `geel`, `oranje`, `rood`.
- Mapping in deze app: `geel => groen`, `oranje/rood => rood`.
- Indicatie hoe lang de huidige toestand naar verwachting duurt.
- Uurlijkse balk voor de komende 24 uur.
- Optionele browsermelding bij overgang van rood naar groen.
- Installeren als PWA op telefoon of desktop.

## Lokaal starten
Je hebt een lokale webserver nodig (niet via `file://` openen).

Optie 1 (Python):
```bash
python -m http.server 8080
```

Open daarna:
- Op desktop: `http://localhost:8080`
- Op telefoon (zelfde wifi): `http://<jouw-lokaal-ip>:8080`

## Belangrijk
- Deze versie werkt alleen als je locatie in Nederland ligt.
- Meldingen werken alleen als de site via `https://` of `localhost` draait.
- Zonder backend worden meldingen alleen verstuurd zolang de app actief is.

## Databron
- Open-Meteo Forecast API (wind)
- Open-Meteo Air Quality API (PM2.5, Europese AQI)

## Publiceren op GitHub Pages
Deze map bevat al een workflow: `.github/workflows/deploy-pages.yml`.

Volg deze stappen eenmalig:
1. Maak op GitHub een nieuwe lege repository (zonder README).
2. Initialiseer deze map als git-repo en push:
```bash
git init
git branch -M main
git add .
git commit -m "Initial PWA version"
git remote add origin https://github.com/<jouw-gebruiker>/<jouw-repo>.git
git push -u origin main
```
3. Ga in GitHub naar `Settings > Pages`.
4. Kies bij `Build and deployment` als `Source`: `GitHub Actions`.
5. Wacht tot de workflow `Deploy To GitHub Pages` groen is.

Daarna staat je app op:
`https://<jouw-gebruiker>.github.io/<jouw-repo>/`

## Criteria (huidige implementatie)
- `Windkracht <= 2 Bft` => `rood`.
- Bij `Windkracht >= 3 Bft`:
  - `PM2.5 >= 50 ug/m3` => `rood` (benadering van LKI PM2.5 >= 7).
  - `PM2.5 20-49 ug/m3` => `oranje` (benadering van LKI PM2.5 4-6).
  - `PM2.5 < 20 ug/m3` => `geel`.
