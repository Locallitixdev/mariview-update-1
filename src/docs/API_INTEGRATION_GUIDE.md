# API Integration Guide
## Real-time ADS-B & AIS Data Integration

### Overview
Sistem Mariview dapat diintegrasikan dengan live data dari:
- **ADS-B (Aircraft)**: FlightRadar24, OpenSky Network, ADS-B Exchange
- **AIS (Marine)**: Marine Traffic, AIS Hub, VesselFinder

---

## 🛩️ ADS-B Integration (Aircraft Tracking)

### Option 1: OpenSky Network (Recommended - FREE)
**Pros:**
- Free tier available (no credit card required)
- Good coverage around major airports
- Simple REST API
- No rate limiting for anonymous requests

**Setup Steps:**
1. Visit: https://openskynetwork.github.io/opensky-api/
2. Optional: Create account for higher rate limits
3. API sudah ready to use (lihat `/services/adsb-api.ts`)

**API Endpoint:**
```
GET https://opensky-network.org/api/states/all?lamin={minLat}&lomin={minLon}&lamax={maxLat}&lomax={maxLon}
```

**Rate Limits:**
- Anonymous: 100 requests/day
- Registered: 400 requests/day
- Premium: Unlimited (€20/month)

---

### Option 2: FlightRadar24 (Premium)
**Pros:**
- Most accurate real-time data
- Global coverage
- Historical data available

**Cons:**
- Expensive (~$500-$1000/month for API access)
- Requires business account

**Setup Steps:**
1. Contact: https://www.flightradar24.com/premium/
2. Request API access
3. Get API key
4. Update `/services/adsb-api.ts` with endpoint

---

### Option 3: ADS-B Exchange (FREE)
**Pros:**
- Free API access
- Community-driven
- Good coverage

**Setup Steps:**
1. Visit: https://www.adsbexchange.com/data/
2. Register for free API key
3. Read documentation: https://www.adsbexchange.com/version-2-api-wip/

---

## 🚢 AIS Integration (Marine Tracking)

### Option 1: Marine Traffic API (Recommended)
**Pricing:**
- Starter: $50/month (1,000 requests)
- Professional: $200/month (10,000 requests)
- Enterprise: Custom pricing

**Setup Steps:**

1. **Register:**
   ```
   https://www.marinetraffic.com/en/ais-api-services
   ```

2. **Choose API Package:**
   - PS01 - Simple Positions
   - PS03 - Extended Vessel Details
   - PS07 - Single Vessel Positions

3. **Get API Key:**
   - Go to Dashboard → API Services → Get API Key
   - Copy your API key

4. **Update Code:**
   ```typescript
   // File: /services/ais-api.ts
   const AIS_API_KEY = 'YOUR_ACTUAL_API_KEY_HERE';
   ```

5. **Uncomment Real API Call:**
   ```typescript
   // In fetchAISData() function:
   // Remove getMockAISData()
   // Uncomment the fetch() code block
   ```

**API Endpoint Example:**
```
GET https://services.marinetraffic.com/api/exportvessels/{API_KEY}/v:8/protocol:jsono/msgtype:extended/min_lat:-6.15/max_lat:-6.05/min_lon:106.85/max_lon:106.95
```

---

### Option 2: AIS Hub (Free Tier Available)
**Pros:**
- Free tier: 500 requests/day
- Good for testing

**Setup Steps:**
1. Register: https://www.aishub.net/
2. Get free API key
3. Read docs: https://www.aishub.net/api

**Cons:**
- Lower data quality than Marine Traffic
- Limited vessel details

---

### Option 3: VesselFinder API
**Pricing:**
- Similar to Marine Traffic
- Starting €99/month

**Setup:**
1. Visit: https://www.vesselfinder.com/api
2. Contact sales for API access

---

## 🔧 Implementation Steps

### 1. Choose Your APIs
```typescript
// Recommendation for Production:
// - ADS-B: OpenSky Network (Free) or FlightRadar24 (Paid)
// - AIS: Marine Traffic (Paid, most reliable)

// Recommendation for Development:
// - ADS-B: OpenSky Network (Free)
// - AIS: Mock data (already included)
```

### 2. Get API Keys
- OpenSky Network: Optional (better without for testing)
- Marine Traffic: Required (paid subscription)

### 3. Update Configuration
```typescript
// File: /services/adsb-api.ts
const ADSB_API_KEY = 'your-opensky-key-here'; // Optional

// File: /services/ais-api.ts
const AIS_API_KEY = 'your-marinetraffic-key-here'; // Required
```

### 4. Enable Real API Calls
In both files, uncomment the real fetch() blocks:

```typescript
// /services/adsb-api.ts - Line ~40
// Uncomment this block:
const response = await fetch(url, { ... });

// /services/ais-api.ts - Line ~60
// Uncomment this block:
const response = await fetch(url, { ... });
```

### 5. Test Integration
```typescript
// Test ADS-B
import { fetchADSBData } from './services/adsb-api';
const aircraft = await fetchADSBData();
console.log('Aircraft:', aircraft);

// Test AIS
import { fetchAISData } from './services/ais-api';
const vessels = await fetchAISData();
console.log('Vessels:', vessels);
```

---

## 📊 Usage in Components

### Dashboard Integration
```typescript
import { fetchADSBData } from '../services/adsb-api';
import { fetchAISData } from '../services/ais-api';
import { useEffect, useState } from 'react';

function Dashboard() {
  const [aircraft, setAircraft] = useState([]);
  const [vessels, setVessels] = useState([]);

  useEffect(() => {
    // Fetch initial data
    const loadData = async () => {
      const adsbData = await fetchADSBData();
      const aisData = await fetchAISData();
      
      setAircraft(adsbData);
      setVessels(aisData);
    };

    loadData();

    // Poll every 30 seconds
    const interval = setInterval(loadData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <SimpleOperationsMap
      drones={liveOperations}
      vessels={vessels}
      adsbData={aircraft}
    />
  );
}
```

### Live Operations Integration
```typescript
import { setupADSBPolling, setupAISPolling } from '../services/...';

useEffect(() => {
  // Setup automatic polling
  const cleanupADSB = setupADSBPolling((data) => {
    setAircraftData(data);
  }, 10000); // Update every 10 seconds

  const cleanupAIS = setupAISPolling((data) => {
    setVesselData(data);
  }, 30000); // Update every 30 seconds

  return () => {
    cleanupADSB();
    cleanupAIS();
  };
}, []);
```

---

## ⚠️ Important Notes

### CORS Issues
Browser requests to external APIs may be blocked by CORS. Solutions:

1. **Use Backend Proxy (Recommended)**
   ```typescript
   // Create API route in your backend
   // Backend calls Marine Traffic/OpenSky
   // Frontend calls your backend
   ```

2. **Use CORS Proxy (Development Only)**
   ```typescript
   const PROXY_URL = 'https://cors-anywhere.herokuapp.com/';
   fetch(PROXY_URL + API_URL);
   ```

### Rate Limiting
- OpenSky: Max 100 anonymous requests/day
- Marine Traffic: Based on subscription plan
- Always implement caching and polling intervals

### Error Handling
Both services include automatic fallback to mock data if API fails.

---

## 💰 Cost Estimation

### Budget Setup (Recommended for Start):
- ADS-B: OpenSky Network (FREE)
- AIS: Marine Traffic Starter ($50/month)
- **Total: $50/month**

### Professional Setup:
- ADS-B: FlightRadar24 Business ($500/month)
- AIS: Marine Traffic Professional ($200/month)
- **Total: $700/month**

---

## 🧪 Testing

### Current Mock Data Includes:
- ✅ 4 aircraft around Soekarno-Hatta Airport
- ✅ 5 vessels around Tanjung Priok Port
- ✅ Realistic MMSI, IMO, callsigns
- ✅ Speed, course, heading data
- ✅ ETA and destination info

### Switch to Live Data:
Simply uncomment real API calls and add API keys. Mock data will automatically be replaced with live data.

---

## 📞 Support

### OpenSky Network
- Docs: https://openskynetwork.github.io/opensky-api/
- Community: https://opensky-network.org/community

### Marine Traffic
- Support: api-support@marinetraffic.com
- Docs: https://www.marinetraffic.com/en/ais-api-services/documentation

---

## ✅ Checklist

- [ ] Choose ADS-B provider
- [ ] Choose AIS provider
- [ ] Get API keys
- [ ] Update `/services/adsb-api.ts`
- [ ] Update `/services/ais-api.ts`
- [ ] Uncomment real API calls
- [ ] Test with small bounds first
- [ ] Implement error handling
- [ ] Setup monitoring/logging
- [ ] Configure polling intervals
- [ ] Monitor API usage/costs
