-- Norwegian Views for FinanseHub Database (Correct Column Names)
-- Creating Norwegian-friendly views for Power BI integration

-- 1. Valutakurser (Currency Rates) with Norwegian names
CREATE OR REPLACE VIEW valutakurser_norsk AS
SELECT 
    r.date as dato,
    r.base as valuta_kode,
    CASE r.base
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
        ELSE r.base
    END as valuta_navn,
    r.value as kurs,
    r.quote as mot_valuta,
    CURRENT_TIMESTAMP as opprettet
FROM "Rate" r
WHERE r.quote = 'NOK'
ORDER BY r.date DESC, r.base;

-- 2. Renter (Interest Rates) with Norwegian descriptions
CREATE OR REPLACE VIEW renter_norsk AS
SELECT 
    sp.date as dato,
    sp.series as serie_navn,
    COALESCE(sp.label, 
        CASE sp.series
            WHEN 'STYRINGSRENTE' THEN 'Styringsrente - Norges Banks styringsrente'
            WHEN 'NIBOR3M' THEN 'NIBOR 3 måneder - Norske Interbank Offered Rate'
            WHEN 'NIBOR6M' THEN 'NIBOR 6 måneder - Norske Interbank Offered Rate'
            WHEN 'NIBOR12M' THEN 'NIBOR 12 måneder - Norske Interbank Offered Rate'
            WHEN 'FOLIORENTE' THEN 'Foliorente - Norges Banks innskuddsrente'
            WHEN 'UTLANSRENTE' THEN 'Utlånsrente - Norges Banks utlånsrente'
            WHEN 'STATSKASSEVEKSLER' THEN 'Statskasseveksler - Kortsiktige statspapirer'
            WHEN 'STATSOBLIGASJONER' THEN 'Statsobligasjoner - Langsiktige statspapirer'
            ELSE sp.series
        END
    ) as beskrivelse,
    sp.value as verdi,
    CURRENT_TIMESTAMP as opprettet
FROM "SeriesPoint" sp
ORDER BY sp.date DESC, sp.series;

-- 3. Siste Kurser (Latest Currency Rates)
CREATE OR REPLACE VIEW siste_kurser_norsk AS
SELECT DISTINCT ON (r.base)
    r.base as valuta_kode,
    CASE r.base
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
        ELSE r.base
    END as valuta_navn,
    r.value as siste_kurs,
    r.date as siste_dato
FROM "Rate" r
WHERE r.quote = 'NOK'
ORDER BY r.base, r.date DESC;

-- 4. Siste Renter (Latest Interest Rates)
CREATE OR REPLACE VIEW siste_renter_norsk AS
SELECT DISTINCT ON (sp.series)
    sp.series as serie_navn,
    COALESCE(sp.label,
        CASE sp.series
            WHEN 'STYRINGSRENTE' THEN 'Styringsrente - Norges Banks styringsrente'
            WHEN 'NIBOR3M' THEN 'NIBOR 3 måneder - Norske Interbank Offered Rate'
            WHEN 'NIBOR6M' THEN 'NIBOR 6 måneder - Norske Interbank Offered Rate'
            WHEN 'NIBOR12M' THEN 'NIBOR 12 måneder - Norske Interbank Offered Rate'
            WHEN 'FOLIORENTE' THEN 'Foliorente - Norges Banks innskuddsrente'
            WHEN 'UTLANSRENTE' THEN 'Utlånsrente - Norges Banks utlånsrente'
            WHEN 'STATSKASSEVEKSLER' THEN 'Statskasseveksler - Kortsiktige statspapirer'
            WHEN 'STATSOBLIGASJONER' THEN 'Statsobligasjoner - Langsiktige statspapirer'
            ELSE sp.series
        END
    ) as beskrivelse,
    sp.value as siste_verdi,
    sp.date as siste_dato
FROM "SeriesPoint" sp
ORDER BY sp.series, sp.date DESC;

-- 5. Data Sammendrag (Data Summary) with Norwegian labels
CREATE OR REPLACE VIEW data_sammendrag_norsk AS
SELECT 
    (SELECT COUNT(*) FROM "Rate" WHERE quote = 'NOK') as totalt_valutakurser,
    (SELECT COUNT(*) FROM "SeriesPoint") as totalt_renter,
    (SELECT MAX(date) FROM "Rate" WHERE quote = 'NOK') as siste_valuta_dato,
    (SELECT MAX(date) FROM "SeriesPoint") as siste_rente_dato,
    (SELECT COUNT(DISTINCT base) FROM "Rate" WHERE quote = 'NOK') as tilgjengelige_valutaer,
    (SELECT COUNT(DISTINCT series) FROM "SeriesPoint") as tilgjengelige_serier;

-- Test the views
SELECT 'Views created successfully!' as status;
