# pwd.md

```markdown
# finanseHub – Hemmeligheter og tilganger (PWD/Secrets)

> Alle hemmeligheter lagres i **Azure Key Vault (RBAC)**. Appene (Functions) leser via Managed Identity + rollen **Key Vault Secrets User**.

## Key Vault – secrets (navn og formater)

- `DATABASE-URL`  
  `postgresql://<user>:<pass>@finansehub-db.postgres.database.azure.com:5432/fx?sslmode=require`

- `CRON-KEY`  
  Tilfeldig hex, brukes hvis du har en manuell synk‑endpoint beskyttet med header `X-CRON-KEY`.

- `PBI-TENANT-ID`  
  Tenant GUID (Microsoft Entra ID).

- `PBI-CLIENT-ID`  
  App (service principal) clientId.

- `PBI-CLIENT-SECRET`  
  Hemmelighet for SPN (roteres jevnlig).

- `PBI-GROUP-ID`  
  Power BI Workspace (Group) ID.

- `PBI-DATASET-ID`  
  Dataset ID i samme workspace.

*(Valgfritt)*  
- `TEAMS-WEBHOOK-URL` – for varsler.

## Roller og identiteter
- **Function App (system‑tildelt identitet)** → rolle `Key Vault Secrets User` på hvelvet.
- **Din bruker** → `Key Vault Secrets Officer` (for å opprette/endre secrets).
- **Power BI service principal** → Member/Admin i workspace + tenantinnstilling for SPN‑API aktivert.

## Database‑tilgang
- **Adminbruker** (`<user>` over) holdes hemmelig i Key Vault.  
- **Read‑only bruker for BI** anbefales:
  ```sql
  CREATE ROLE ro_bi LOGIN PASSWORD '<sterkt-passord>';
  GRANT CONNECT ON DATABASE fx TO ro_bi;
  GRANT USAGE ON SCHEMA public TO ro_bi;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO ro_bi;
  ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ro_bi;
Connection string til BI‑bruker lagres i KV som DATABASE-URL-BI hvis ønskelig.

Rotasjon
DB‑passord: az postgres flexible-server update --admin-password … → oppdater DATABASE-URL i KV.

PBI CLIENT SECRET: az ad app credential reset → oppdater i KV.

Etter rotasjon: restart Function for å hente nye secrets.
