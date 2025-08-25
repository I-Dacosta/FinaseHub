-- Norwegian Views for FinanseHub Database
-- Creating Norwegian-friendly views for Power BI integration

-- 1. Valutakurser (Currency Rates) with Norwegian names
CREATE OR REPLACE VIEW valutakurser_norsk AS
SELECT 
    r.date as dato,
    r.base_currency as valuta_kode,
    CASE r.base_currency
        WHEN 'USD' THEN 'Amerikanske dollar'
        WHEN 'EUR' THEN 'Euro'
        WHEN 'GBP' THEN 'Britiske pund'
        WHEN 'SEK' THEN 'Svenske kroner'
        WHEN 'DKK' THEN 'Danske kroner'
        WHEN 'JPY' THEN 'Japanske yen'
        WHEN 'CHF' THEN 'Sveitsiske franc'
        WHEN 'AUD' THEN 'Australske dollar'
        WHEN 'CAD' THEN 'Kanadiske dollar'
        WHEN 'NZD' THEN 'New Zealand-dollar'
        WHEN 'ISK' THEN 'Islandske kroner'
        WHEN 'PLN' THEN 'Polske zloty'
        WHEN 'CZK' THEN 'Tsjekkiske kroner'
        WHEN 'HUF' THEN 'Ungarske forint'
        WHEN 'RON' THEN 'Rumenske leu'
        WHEN 'BGN' THEN 'Bulgarske lev'
        WHEN 'HRK' THEN 'Kroatiske kuna'
        WHEN 'RUB' THEN 'Russiske rubler'
        WHEN 'CNY' THEN 'Kinesiske yuan'
        WHEN 'INR' THEN 'Indiske rupier'
        WHEN 'BRL' THEN 'Brasilianske real'
        WHEN 'ZAR' THEN 'Sørafrikanske rand'
        WHEN 'KRW' THEN 'Sørkoreanske won'
        WHEN 'SGD' THEN 'Singapore-dollar'
        WHEN 'THB' THEN 'Thailandske baht'
        WHEN 'MXN' THEN 'Meksikanske peso'
        WHEN 'IDR' THEN 'Indonesiske rupiah'
        WHEN 'CLP' THEN 'Chilenske peso'
        ELSE r.base_currency
    END as valuta_navn,
    r.rate as kurs,
    r.unit as enhet,
    r.created_at as opprettet
FROM "Rate" r
ORDER BY r.date DESC, r.base_currency;

-- 2. Renter (Interest Rates) with Norwegian descriptions
CREATE OR REPLACE VIEW renter_norsk AS
SELECT 
    sp.date as dato,
    sp.series_name as serie_navn,
    CASE sp.series_name
        WHEN 'STYRINGSRENTE' THEN 'Styringsrente - Norges Banks styringsrente'
        WHEN 'NIBOR3M' THEN 'NIBOR 3 måneder - Norske Interbank Offered Rate'
        WHEN 'NIBOR6M' THEN 'NIBOR 6 måneder - Norske Interbank Offered Rate'
        WHEN 'NIBOR12M' THEN 'NIBOR 12 måneder - Norske Interbank Offered Rate'
        WHEN 'FOLIORENTE' THEN 'Foliorente - Norges Banks innskuddsrente'
        WHEN 'UTLANSRENTE' THEN 'Utlånsrente - Norges Banks utlånsrente'
        WHEN 'STATSKASSEVEKSLER' THEN 'Statskasseveksler - Kortsiktige statspapirer'
        WHEN 'STATSOBLIGASJONER' THEN 'Statsobligasjoner - Langsiktige statspapirer'
        ELSE sp.series_name
    END as beskrivelse,
    sp.value as verdi,
    sp.created_at as opprettet
FROM "SeriesPoint" sp
ORDER BY sp.date DESC, sp.series_name;

-- 3. Siste Kurser (Latest Currency Rates)
CREATE OR REPLACE VIEW siste_kurser_norsk AS
SELECT DISTINCT ON (r.base_currency)
    r.base_currency as valuta_kode,
    CASE r.base_currency
        WHEN 'USD' THEN 'Amerikanske dollar'
        WHEN 'EUR' THEN 'Euro'
        WHEN 'GBP' THEN 'Britiske pund'
        WHEN 'SEK' THEN 'Svenske kroner'
        WHEN 'DKK' THEN 'Danske kroner'
        WHEN 'JPY' THEN 'Japanske yen'
        WHEN 'CHF' THEN 'Sveitsiske franc'
        WHEN 'AUD' THEN 'Australske dollar'
        WHEN 'CAD' THEN 'Kanadiske dollar'
        WHEN 'NZD' THEN 'New Zealand-dollar'
        WHEN 'ISK' THEN 'Islandske kroner'
        WHEN 'PLN' THEN 'Polske zloty'
        WHEN 'CZK' THEN 'Tsjekkiske kroner'
        WHEN 'HUF' THEN 'Ungarske forint'
        WHEN 'RON' THEN 'Rumenske leu'
        WHEN 'BGN' THEN 'Bulgarske lev'
        WHEN 'HRK' THEN 'Kroatiske kuna'
        WHEN 'RUB' THEN 'Russiske rubler'
        WHEN 'CNY' THEN 'Kinesiske yuan'
        WHEN 'INR' THEN 'Indiske rupier'
        WHEN 'BRL' THEN 'Brasilianske real'
        WHEN 'ZAR' THEN 'Sørafrikanske rand'
        WHEN 'KRW' THEN 'Sørkoreanske won'
        WHEN 'SGD' THEN 'Singapore-dollar'
        WHEN 'THB' THEN 'Thailandske baht'
        WHEN 'MXN' THEN 'Meksikanske peso'
        WHEN 'IDR' THEN 'Indonesiske rupiah'
        WHEN 'CLP' THEN 'Chilenske peso'
        ELSE r.base_currency
    END as valuta_navn,
    r.rate as siste_kurs,
    r.date as siste_dato,
    r.unit as enhet
FROM "Rate" r
ORDER BY r.base_currency, r.date DESC;

-- 4. Siste Renter (Latest Interest Rates)
CREATE OR REPLACE VIEW siste_renter_norsk AS
SELECT DISTINCT ON (sp.series_name)
    sp.series_name as serie_navn,
    CASE sp.series_name
        WHEN 'STYRINGSRENTE' THEN 'Styringsrente - Norges Banks styringsrente'
        WHEN 'NIBOR3M' THEN 'NIBOR 3 måneder - Norske Interbank Offered Rate'
        WHEN 'NIBOR6M' THEN 'NIBOR 6 måneder - Norske Interbank Offered Rate'
        WHEN 'NIBOR12M' THEN 'NIBOR 12 måneder - Norske Interbank Offered Rate'
        WHEN 'FOLIORENTE' THEN 'Foliorente - Norges Banks innskuddsrente'
        WHEN 'UTLANSRENTE' THEN 'Utlånsrente - Norges Banks utlånsrente'
        WHEN 'STATSKASSEVEKSLER' THEN 'Statskasseveksler - Kortsiktige statspapirer'
        WHEN 'STATSOBLIGASJONER' THEN 'Statsobligasjoner - Langsiktige statspapirer'
        ELSE sp.series_name
    END as beskrivelse,
    sp.value as siste_verdi,
    sp.date as siste_dato
FROM "SeriesPoint" sp
ORDER BY sp.series_name, sp.date DESC;

-- 5. Data Sammendrag (Data Summary) with Norwegian labels
CREATE OR REPLACE VIEW data_sammendrag_norsk AS
SELECT 
    (SELECT COUNT(*) FROM "Rate") as totalt_valutakurser,
    (SELECT COUNT(*) FROM "SeriesPoint") as totalt_renter,
    (SELECT MAX(created_at) FROM "Rate") as siste_oppdatering_valuta,
    (SELECT MAX(created_at) FROM "SeriesPoint") as siste_oppdatering_renter,
    (SELECT COUNT(DISTINCT base_currency) FROM "Rate") as tilgjengelige_valutaer,
    (SELECT COUNT(DISTINCT series_name) FROM "SeriesPoint") as tilgjengelige_serier,
    (SELECT MAX(date) FROM "Rate") as siste_valuta_dato,
    (SELECT MAX(date) FROM "SeriesPoint") as siste_rente_dato;

-- Grant permissions for Power BI access
GRANT SELECT ON valutakurser_norsk TO finansehub_admin;
GRANT SELECT ON renter_norsk TO finansehub_admin;
GRANT SELECT ON siste_kurser_norsk TO finansehub_admin;
GRANT SELECT ON siste_renter_norsk TO finansehub_admin;
GRANT SELECT ON data_sammendrag_norsk TO finansehub_admin;
