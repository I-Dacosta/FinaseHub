# 🎯 Power BI DirectQuery Setup - Norske Finansdata

## ✅ **Server Status: Burstable Tier (Kostnad Optimalisert)**

- **SKU**: Standard_B1ms (Burstable)
- **Månedskostnad**: ~500 NOK (vs 1,600 NOK for General Purpose)
- **Besparelse**: 1,100 NOK/måned (69% billigere!)

## 📊 **Power BI DirectQuery Setup Guide**

### **Steg 1: Åpne Power BI Desktop**

1. Last ned og installer **Power BI Desktop** (gratis)
2. Åpne Power BI Desktop

### **Steg 2: Koble til PostgreSQL Database**

1. Klikk **"Get Data"** → **"More..."**
2. Søk etter **"PostgreSQL database"**
3. Velg **"PostgreSQL database"** og klikk **"Connect"**

### **Steg 3: Fyll inn Tilkoblingsdetaljer**

```
Server: finansehub-db.postgres.database.azure.com
Database: fx
Data Connectivity mode: DirectQuery (VIKTIG!)
```

**VIKTIG**: Velg **DirectQuery** mode for real-time data!

### **Steg 4: Autentisering**

1. Velg **"Database"** authentication
2. Fyll inn:
   ```
   User name: finansehub_admin
   Password: OAsd2amudO38Pn6k9kt7t0NmS
   ```
3. Klikk **"Connect"**

### **Steg 5: Velg Norske Tables**

Power BI vil vise alle tilgjengelige tabeller. Velg disse **norske views**:

#### ✅ **Hovedtabeller (Anbefalt):**
- `valutakurser_norsk` - 6,600+ valutakurser med norske navn
- `renter_norsk` - 661+ renter med norske beskrivelser  
- `siste_kurser_norsk` - Siste valutakurser per valuta
- `data_sammendrag_norsk` - Komplett sammendrag

#### 📊 **Data du får:**
- **Valuta navn på norsk**: "Amerikanske dollar", "Euro", etc.
- **Periode beskrivelser**: "Siste 30 dager", "Årssammenligning"
- **Real-time data**: Automatisk oppdatering
- **Historiske data**: Fra 2023-01-01

### **Steg 6: Last Data og Bygg Rapport**

1. Klikk **"Load"** 
2. Power BI laster metadata (ikke all data - det er DirectQuery!)
3. Start bygge visualiseringer

## 📈 **Foreslåtte Visualiseringer**

### **Dashboard 1: Valutakurser**
```
Tabell: valutakurser_norsk
X-akse: dato
Y-akse: kurs_verdi  
Legende: valuta_navn_norsk
Filter: base_valuta = "NOK"
```

### **Dashboard 2: Renteutvikling**
```
Tabell: renter_norsk
X-akse: dato
Y-akse: rente_verdi
Legende: rente_type_norsk
```

### **Dashboard 3: Sammendrag**
```
Tabell: data_sammendrag_norsk
Kort: Totale valutaer, Siste oppdatering
Gauge: Høyeste/laveste kurs
```

## 🔄 **Auto-Refresh Setup**

### **I Power BI Desktop:**
1. Gå til **"Modeling"** → **"Refresh"**
2. Data hentes live fra database (DirectQuery)

### **I Power BI Service (Online):**
1. Publiser rapport til Power BI Service
2. Sett opp **automatisk refresh** (hver time/dag)
3. Data er alltid oppdatert fra PostgreSQL

## ⚡ **Ytelse Tips**

### **Optimalisering:**
- Bruk **filtre** for å begrense data (dato-range, spesifikke valutaer)
- De norske views er allerede optimalisert med riktige indekser
- DirectQuery sender bare nødvendige spørringer til database

### **Best Practices:**
- Start med `siste_kurser_norsk` for nyeste data
- Bruk `data_sammendrag_norsk` for KPI-kort
- Legg til **dato-filtre** for å begrense data-mengde

## 🎯 **Resultat**

**Du får:**
- ✅ **Real-time norske finansdata** i Power BI
- ✅ **500 NOK/måned** i stedet for 1,600 NOK
- ✅ **Samme datainnhold** som Fabric mirroring ville gitt
- ✅ **Norske navn og beskrivelser** 
- ✅ **Automatisk oppdatering**

**Du mister:**
- ❌ Fabric mirroring (men trenger det ikke!)
- ❌ OneLake integrasjon (men DirectQuery er bedre for din bruk)

## 💡 **Hvis du får problemer:**

1. **Tilkobling feiler**: Sjekk at server navn er riktig
2. **Ingen data**: Kontroller at du valgte `DirectQuery` mode
3. **Ytelse problemer**: Legg til dato-filtre

## 📅 **Viktig om Data-oppdatering:**

### **Når kommer nye data?**
- **Norges Bank** publiserer valutakurser **hver dag kl. ~16:00**
- **Siste tilgjengelige data**: 2025-08-19 (går)
- **Neste oppdatering**: 2025-08-20 kl. ~16:00
- **Helger**: Ingen nye kurser på lørdag/søndag

### **Hvorfor er ikke dagens data tilgjengelig enda?**
- Du ser nå data fra **19. august** fordi dagens kurser (20. august) blir publisert senere i dag
- Dette er **normalt** - sentralbanker publiserer alltid med forsinkelse
- Databasen synkroniseres **automatisk** når nye data blir tilgjengelig

### **Power BI vil automatisk vise nye data:**
- ✅ DirectQuery henter data live fra database
- ✅ Når dagens kurser publiseres kl. ~16:00, vises de umiddelbart i Power BI
- ✅ Ingen manual refresh nødvendig!

Alle norske views er testet og fungerer perfekt! 🇳🇴

---

**Total kostnad**: ~500 NOK/måned (69% besparelse!)  
**Funksjonalitet**: 100% av det du trenger ✅  
**Data-oppdatering**: Automatisk når Norges Bank publiserer (kl. ~16:00) 📊
