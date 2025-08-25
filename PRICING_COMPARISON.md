# 💰 Prisforskjell: Burstable vs General Purpose

## 📊 Server Oppgradering Kostnader

### **Før (Burstable)**: 
- **SKU**: Standard_B1ms
- **Tier**: Burstable
- **vCores**: 1 vCore
- **RAM**: ~2 GB
- **Estimert pris**: ~400-600 NOK/måned

### **Etter (General Purpose)**:
- **SKU**: Standard_D2s_v3  
- **Tier**: General Purpose
- **vCores**: 2 vCores
- **RAM**: 8 GB
- **Estimert pris**: ~1,500-2,000 NOK/måned

## 💸 **Prisøkning: ~3-4x høyere kostnad**

### 🔍 **Kostnadsanalyse:**

| Komponent | Burstable (B1ms) | General Purpose (D2s_v3) | Økning |
|-----------|------------------|---------------------------|---------|
| **Compute** | ~400 NOK/mnd | ~1,500 NOK/mnd | +275% |
| **Storage** | 32 GB (~100 NOK) | 32 GB (~100 NOK) | 0% |
| **IOPS** | 120 | 120 | 0% |
| **Total** | ~500 NOK/mnd | ~1,600 NOK/mnd | +220% |

### ⚖️ **Vurdering:**

#### **Fordeler med General Purpose:**
- ✅ **Fabric Mirroring støtte** (HOVEDMÅLET)
- ✅ **Bedre ytelse** (2x vCores, 4x RAM)
- ✅ **Mer stabil ytelse** (ikke burstable begrensninger)
- ✅ **Produksjonsklar** for større arbeidsbelastninger

#### **Ulemper:**
- ❌ **3-4x høyere kostnad** (~1,100 NOK mer per måned)
- ❌ **Overprovisjonert** for nåværende datavolum (6,600 records)

## 🎯 **Alternative Løsninger:**

### **Alternativ 1: Behold General Purpose (ANBEFALT)**
- **Kostnad**: ~1,600 NOK/måned
- **Resultat**: Fabric mirroring fungerer perfekt
- **Verdi**: Få maks ut av Microsoft Fabric ecosystem

### **Alternativ 2: Gå tilbake til Burstable + Power BI DirectQuery**
- **Kostnad**: ~500 NOK/måned  
- **Resultat**: Fortsatt norske data i Power BI
- **Begrensning**: Ingen Fabric mirroring

### **Alternativ 3: Optimaliser General Purpose**
Prøv mindre General Purpose SKU hvis tilgjengelig:
- **Standard_D1s_v3** (1 vCore, 4 GB) - ~800-1,000 NOK/mnd

## 💡 **Anbefaling:**

**Hvis Fabric mirroring er viktig**: Behold General Purpose  
**Hvis kostnad er viktigst**: Gå tilbake til Burstable + DirectQuery

Vil du at jeg skal vise hvordan du går tilbake til Burstable tier for å spare kostnader?

---

**Nåværende månedskostnad**: ~1,600 NOK  
**Tidligere månedskostnad**: ~500 NOK  
**Økning**: +1,100 NOK/måned (+220%)
