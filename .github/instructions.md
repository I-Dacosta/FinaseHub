# finanseHub – Instruksjoner (backend, database, Power BI)

## 1) Oppsett i Azure (kortversjon)
1. **Resource Group** – f.eks. `rg-finansehub` (du kan bruke `rg-valutahub` om den finnes fra før).
2. **PostgreSQL Flexible Server** – region `norwayeast`, f.eks. `finansehub-db`, lag DB `fx`.
3. **Key Vault** – RBAC aktivert (`--enable-rbac-authorization`).
4. **Function App (Linux, Node 22)** – `finansehub-functions`.
5. **Application Insights** – knyttes til Function.
6. **Managed Identity** – på Function; gi rollen **Key Vault Secrets User** på Key Vault.
7. **Secrets i Key Vault**:
   - `DATABASE-URL` – `postgresql://<user>:<pass>@finansehub-db.postgres.database.azure.com:5432/fx?sslmode=require`
   - `CRON-KEY` – tilfeldig hex
   - Power BI: `PBI-TENANT-ID`, `PBI-CLIENT-ID`, `PBI-CLIENT-SECRET`, `PBI-GROUP-ID`, `PBI-DATASET-ID`

> Brannmur: åpne klient‑IP (for lokal Power BI Desktop) eller bruk gateway/Dataflow senere.

## 2) Power BI – service principal
- I **Power BI Admin portal**: Skru på **Service principals can use Power BI APIs**.
- I workspace **finanseHub**: Legg til appen (SPN) som **Member/Admin**.
- Hent **Group (Workspace) ID** og **Dataset ID** fra URL i Power BI Service, og legg i Key Vault.

## 3) App settings på Function
Sett disse (Key Vault‑referanser og konfig):

```bash
az functionapp config appsettings set -g <RG> -n <FUNCTION_NAME> --settings \
  "WEBSITE_TIME_ZONE=W. Europe Standard Time" \
  "DATABASE_URL=@Microsoft.KeyVault(VaultName=<KV>;SecretName=DATABASE-URL)" \
  "CRON_KEY=@Microsoft.KeyVault(VaultName=<KV>;SecretName=CRON-KEY)" \
  "NB_BASES=USD,EUR,GBP,SEK,DKK,CAD,ISK,AUD,NZD,IDR,CLP" \
  "NB_QUOTE=NOK" \
  "NB_DEFAULT_START=2023-01-01" \
  "SYNC_MAX_ATTEMPTS=4" "SYNC_BASE_DELAY_MS=2000" "SYNC_MAX_DELAY_MS=30000" \
  "PBI_TENANT_ID=@Microsoft.KeyVault(VaultName=<KV>;SecretName=PBI-TENANT-ID)" \
  "PBI_CLIENT_ID=@Microsoft.KeyVault(VaultName=<KV>;SecretName=PBI-CLIENT-ID)" \
  "PBI_CLIENT_SECRET=@Microsoft.KeyVault(VaultName=<KV>;SecretName=PBI-CLIENT-SECRET)" \
  "PBI_GROUP_ID=@Microsoft.KeyVault(VaultName=<KV>;SecretName=PBI-GROUP-ID)" \
  "PBI_DATASET_ID=@Microsoft.KeyVault(VaultName=<KV>;SecretName=PBI-DATASET-ID)"
4) Timer‑trigger (cron)
Hverdager kl 17:30 (etter NB publisering ~16:00):

schedule: "0 30 17 * * 1-5"

Tidszone: WEBSITE_TIME_ZONE="W. Europe Standard Time"

5) Backend‑flyt
Timer → kaller syncCore:

Finner siste dato i DB per base.

Henter nye rader fra NB fra lastDate+1 → today (eller NB_DEFAULT_START ved første kjøring).

Parser CSV/JSON, normaliserer, createMany({ skipDuplicates: true }).

Etter synk:

Trigge Power BI refresh via REST (service principal).

(Valgfritt) Sende Teams‑varsel.

Feil:

Retry med eksponentiell backoff.

Dead‑letter til Azure Storage Queue.

6) Power BI – koble til DB
Power BI Desktop: Get Data → PostgreSQL →

Server: finansehub-db.postgres.database.azure.com, Database: fx, SSL: Require, Port: 5432

Auth: Basic (<user>, <pass>)

Service:

A) Gateway for klassisk dataset, eller

B) Dataflow Gen2 (ofte uten gateway) mot Azure Postgres.

Refresh trigges av Function etter synk.

7) Datamodell (SQL/Prisma eksempel)
sql
Kopier
Rediger
-- Tabell for valutakurser
CREATE TABLE IF NOT EXISTS "Rate" (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  base TEXT NOT NULL,
  quote TEXT NOT NULL,
  value NUMERIC(18,8) NOT NULL,
  src TEXT NOT NULL DEFAULT 'NB',
  CONSTRAINT rate_unique UNIQUE (date, base, quote)
);

-- Tabell for renteserier / makro
CREATE TABLE IF NOT EXISTS "SeriesPoint" (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  series TEXT NOT NULL,   -- POLICY_RATE, NOWA, GOV_BONDS, GENERIC_RATES
  label TEXT NULL,        -- tenor eller identifikator
  value NUMERIC(18,8) NOT NULL,
  src TEXT NOT NULL DEFAULT 'NB',
  CONSTRAINT series_unique UNIQUE (date, series, label)
);
8) Test
Kjør Function lokalt (func start) eller publiser og se i Log stream.

Bekreft at rader skrives i Rate.

Sjekk at Power BI refresh trigges (workspace → refresh history).

9) Drift
Application Insights: søk logger på timerSync.

Alarmer: feilede kjøringer / exceptions / 0 nye rader over mange dager.

Sikkerhet: roter passord i Key Vault ved behov; bruk read‑only DB‑bruker for BI.

