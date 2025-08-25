# roadmap.md

```markdown
# finanseHub – Roadmap (backend, database, Power BI)

## Fase 1 – Grunnleggende backend + DB (✅)
**Mål:** Hente valutakurser fra Norges Bank og lagre i Postgres.

- [x] Opprette PostgreSQL (Flexible Server) + DB `fx`
- [x] Lage tabell `Rate` med unik (date, base, quote)
- [x] NB‑klient (CSV/JSON) med semikolon‑parser
- [x] Inkrementell synk fra `NB_DEFAULT_START` eller siste dato
- [x] Function timer satt til **hverdager 17:30** (Oslo‑tid)
- [x] Retry med eksponentiell backoff + dead‑letter queue

**Akseptansekriterier**
- Første fullimport gjennomført uten duplikater
- Daglig synk legger inn nye rader
- Feil vises i App Insights, og havner i dead‑letter ved gjentatt feil

## Fase 2 – Power BI integrasjon (✅)
**Mål:** Gjøre data tilgjengelig for BI og automatisere refresh.

- [x] Service principal opprettet og aktivert i PBI‑tenant
- [x] Legge SPN til workspace (Member/Admin)
- [x] Key Vault secrets: `PBI-*`
- [x] Funksjon kaller PBI REST refresh etter synk
- [x] Power BI Desktop kobler til DB og viser `Rate`

**Akseptansekriterier**
- Refresh i PBI Service trigges etter synk
- Rapport viser siste valutakurser uten manuelt inngrep

## Fase 3 – Renteserier (valgfritt, 🔜)
**Mål:** Legge inn `POLICY_RATE`, `NOWA`, `GOV_BONDS`, `GENERIC_RATES`.

- [ ] Tabell `SeriesPoint`
- [ ] NB‑klient utvidet med disse seriene (label for tenor/isin)
- [ ] DAX‑modeller/visuals (policy rate, yield‑kurver)

**Akseptansekriterier**
- Minst én renteserie innlastet daglig
- Enkel visual i PBI som viser utvikling

## Fase 4 – Stabilitet og drift (🔜)
**Mål:** Langsiktig drift uten overraskelser.

- [ ] Alarmer (feilede kjøringer, 0 nye rader > X dager)
- [ ] Dashboard i App Insights (latency, feilrate)
- [ ] Backupstrategi (DB backup retention, evt. geo‑redundant)
- [ ] Dokumentere gjenoppretting (runbook)

**Akseptansekriterier**
- On‑call vet hva som skal gjøres ved NB‑nedetid/DB‑feil
- Alarmer går til riktig kanal

## Fase 5 – BI‑forbedringer (🔜)
**Mål:** Bedre modellering og ytelse i PBI.

- [ ] Read‑only DB‑bruker i Key Vault
- [ ] Egen view for krysskurser og siste kurs per base
- [ ] (Valgfritt) Dataflow Gen2 mot Azure Postgres

**Akseptansekriterier**
- BI‑spørringer svarer < 2 sek på vanlige dashboards
