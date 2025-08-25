# finanseHub – Teknologistack (backend, database, Power BI)

## Mål
- Hente valutakurser og utvalgte renteserier fra **Norges Bank** automatisk.
- Lagre i **Azure Database for PostgreSQL**.
- Gjøre dataene tilgjengelig for **Power BI** (og Excel), med automatisk refresh etter synk.

## Arkitektur (høy nivå)
- **Azure Functions (Node 20, TypeScript)**  
  - Timer‑trigger kl **17:30** hverdager (Oslo‑tid) for å hente og lagre data.
  - Hjelpefunksjoner: Power BI‑refresh, Teams‑varsling (valgfritt), dead‑letter.

- **Azure Database for PostgreSQL (Flexible Server)**  
  - Skjema designet for rask innlasting (upsert) og enkle spørringer i BI.
  - Read‑only bruker for Power BI/Excel.

- **Azure Key Vault (RBAC)**  
  - Hemmeligheter: `DATABASE-URL`, `CRON-KEY`, `PBI-*`, m.fl.
  - Webapp/Function får tilgang via Managed Identity + `Key Vault Secrets User`.

- **Application Insights**  
  - Logging, metrikk, feilanalyse.

## Datakilder (Norges Bank)
- **Valutakurser** (daglig/bankdager): base→NOK
- **Renteserier** (ekstra, kan aktiveres etter behov):
  - `POLICY_RATE` (Styringsrente) – kode: `IR`
  - `NOWA` (Overnattrente) – kode: `SHORT_RATES`
  - `GOV_BONDS` (Statslån kurser/renter) – kode: `SEC`
  - `GENERIC_RATES` (Generiske renter) – kode: `GOVT_GENERIC_RATES`

> NB: Vi konsumerer NB sine CSV/JSON‑endepunkter via en NB‑klient (`nbClient`). CSV bruker ofte semikolon; parser er satt deretter.

## Datamodell (minimum)
- **Tabell `Rate`** (valuta)
  - `id` (PK)
  - `date` (DATE)
  - `base` (TEXT) – f.eks. `USD`, `EUR`, …
  - `quote` (TEXT) – `NOK`
  - `value` (NUMERIC) – NOK per 1 `base`
  - `src` (TEXT) – «NB»
  - Unik: (`date`,`base`,`quote`)

- **Tabell `SeriesPoint`** (renteserier/makro, valgfritt)
  - `id` (PK)
  - `date` (DATE)
  - `series` (TEXT) – f.eks. `POLICY_RATE`, `NOWA`, `GOV_BONDS`, `GENERIC_RATES`
  - `label` (TEXT NULL) – f.eks. tenor («3M», «10Y») eller verdipapirkode
  - `value` (NUMERIC)
  - `src` (TEXT) – «NB»
  - Unik: (`date`,`series`,`label`)

> I Prisma kan disse beskrives som to modeller, og vi kan legge visninger for krysskurser.

## Nøkkel‑miljøvariabler
- **Funksjon/Backend**
  - `DATABASE_URL` (Key Vault ref)
  - `NB_BASES="USD,EUR,GBP,SEK,DKK,JPY,ISK,AUD,NZD,IDR,CLP"`
  - `NB_QUOTE="NOK"`
  - `NB_DEFAULT_START="2023-01-01"`
  - `SYNC_MAX_ATTEMPTS=4`, `SYNC_BASE_DELAY_MS=2000`, `SYNC_MAX_DELAY_MS=30000`
  - `WEBSITE_TIME_ZONE="W. Europe Standard Time"`
  - Power BI: `PBI_TENANT_ID`, `PBI_CLIENT_ID`, `PBI_CLIENT_SECRET`, `PBI_GROUP_ID`, `PBI_DATASET_ID`

- **Power BI**
  - Service principal aktivert for API‑bruk (admin‑innstilling).
  - App (SPN) som **Member/Admin** i workspace.

## Biblioteker
- `@azure/functions`, `@azure/msal-node`, `@azure/storage-queue`
- `pg` / `Prisma` for DB
- Innebygd `fetch` (Node 20)
