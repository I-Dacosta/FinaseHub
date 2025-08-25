#!/bin/bash

# Valutaer som skal synkroniseres
currencies=("EUR" "GBP" "SEK" "DKK" "JPY" "ISK" "AUD" "NZD" "IDR")

echo "🔄 Synkroniserer valutaer for 20. august 2025..."

for currency in "${currencies[@]}"; do
    echo "📊 Henter $currency/NOK..."
    
    # Hent data fra Norges Bank API
    response=$(curl -s "https://data.norges-bank.no/api/data/EXR/B.$currency.NOK.SP?format=csv&locale=no&bom=include&startPeriod=2025-08-20&endPeriod=2025-08-21")
    
    # Ekstraher verdi (siste linje, siste kolonne)
    value=$(echo "$response" | tail -1 | cut -d';' -f16 | tr ',' '.')
    
    if [[ "$value" =~ ^[0-9]+\.[0-9]+$ ]]; then
        echo "  ✅ Funnet: $currency = $value NOK"
        
        # Sett inn i database
        psql "postgresql://finansehub_admin:OAsd2amudO38Pn6k9kt7t0NmS@finansehub-db.postgres.database.azure.com:5432/fx?sslmode=require" -c "
        INSERT INTO \"Rate\" (date, base, quote, value, src) 
        VALUES ('2025-08-20', '$currency', 'NOK', $value, 'NB') 
        ON CONFLICT (date, base, quote) DO UPDATE SET value = EXCLUDED.value;
        " > /dev/null
        
        if [ $? -eq 0 ]; then
            echo "  💾 Lagret i database"
        else
            echo "  ❌ Feil ved lagring"
        fi
    else
        echo "  ⚠️  Ingen data funnet for $currency"
    fi
    
    sleep 1  # Vent litt mellom API-kall
done

echo "✅ Ferdig! Sjekker resultatet..."
