# Mock Data Synchronization Guide

## 📊 Central Data Source: `/data/mock-data.ts`

Semua mock data di aplikasi Mariview sekarang **tersentralisasi** untuk memastikan konsistensi di seluruh komponen.

---

## 🎯 Data Structure Overview

### 1. **Drone Fleet (4 units)**
```typescript
- UAV-001: Pyrhos X V1 (Available, 100% battery)
- UAV-002: AR-2 Aerial (In-flight, 85% battery)
- AUV-001: AquaScan Alpha (Available, 92% battery)
- AUV-002: DeepSeeker Pro (Maintenance, 78% battery)
```

### 2. **Mission History (9 missions)**
```typescript
- 5 UAV Missions (Pyrhos X V1, AR-2 Aerial)
- 3 AUV Missions (AquaScan Alpha, DeepSeeker Pro)
- 1 Mixed Mission
Total: 9 missions (8 success, 1 partial)
```

### 3. **Live Operations (1 active)**
```typescript
- OP-2025-001: Pyrhos X V1 - Port Surveillance
  Location: Tanjung Priok (-6.1064, 106.8818)
  Status: Active (78% battery, 127m altitude)
```

### 4. **AI Detections (4 types)**
```typescript
- Vessel Detection & Recognition (96% confidence)
- Vessel Hull Number Recognition (92% confidence)
- Vessel Attribute Detection (89% confidence)
- Trash Detection (87% confidence)
```

### 5. **AIS Vessels (3 ships)**
```typescript
- MV OCEANIC SPIRIT (Container Ship, 294m)
- ASIAN TRADER (Tanker, 182m)
- PACIFIC HARMONY (Container Ship, 225m)
All around Tanjung Priok Port area
```

### 6. **ADS-B Aircraft (2 planes)**
```typescript
- GA123: 3500ft, 250kts (near Soekarno-Hatta)
- QZ456: 4200ft, 280kts (approach path)
```

---

## 📈 Calculated Statistics

```typescript
missionSummary = {
  totalMissions: 9,
  uavMissions: 6,
  auvMissions: 3,
  activeMissions: 1,
  totalDetections: 508,
  successRate: 89%,
  availableDrones: 2,
  inFlightDrones: 1,
  maintenanceDrones: 1,
  totalVessels: 3,
  totalAircraft: 2,
}
```

---

## 🔄 How Data Flows

```
/data/mock-data.ts (SINGLE SOURCE OF TRUTH)
         ↓
/components/shared-data.ts (Re-exports)
         ↓
All Components Import From shared-data.ts
```

### Components Using Mock Data:

1. **Dashboard**
   - Imports: `missions`, `missionSummary`, `drones`, `liveOperations`
   - Displays: KPI cards, charts, live map

2. **Live Operations**
   - Imports: `liveOperations`, `mockAISData`, `mockADSBData`, `aiDetections`
   - Displays: Live map, telemetry, AI detection results

3. **Mission History**
   - Imports: `missions`, `missionSummary`
   - Displays: Mission list, performance charts

4. **Asset Management**
   - Imports: `drones`
   - Displays: Fleet status, CRUD operations

5. **Settings**
   - Imports: `drones`
   - Displays: Drone parameters configuration

---

## 🛠️ Helper Functions

```typescript
// Get single drone
getDroneById('UAV-001')
getDroneByName('Pyrhos X V1')

// Get missions
getMissionById('M-2025-01-20-001')
getMissionsByDrone('Pyrhos X V1')
getRecentMissions(5)

// Get detections
getDetectionsByMission('M-2025-01-20-001')

// Get vessels
getVesselByMMSI('477123456')
```

---

## ✅ Data Consistency Rules

### Mission Data
- ✅ All dates in January 2025 (recent)
- ✅ Mission IDs format: `M-YYYY-MM-DD-XXX`
- ✅ Drone names match fleet list exactly
- ✅ All UAV missions have altitude data
- ✅ All AUV missions have depth data

### Drone Data
- ✅ 2 UAV (Pyrhos X V1, AR-2 Aerial)
- ✅ 2 AUV (AquaScan Alpha, DeepSeeker Pro)
- ✅ Status: available, in-flight, maintenance, charging
- ✅ Battery levels realistic (0-100%)

### AI Detection Data
- ✅ 4 detection types (Vessel, Hull, Attribute, Trash)
- ✅ All linked to actual missions
- ✅ Confidence levels 87-96%
- ✅ AIS data correlation for vessel detections

### Location Data
- ✅ Tanjung Priok Port: -6.1064, 106.8818
- ✅ AIS vessels within 5km radius
- ✅ ADS-B aircraft near Soekarno-Hatta
- ✅ All coordinates in Jakarta area

---

## 🔄 Updating Mock Data

### To Add New Mission:
```typescript
// File: /data/mock-data.ts
export const missions = [
  ...missions,
  {
    id: 'M-2025-01-21-010',
    name: 'New Mission Name',
    date: '2025-01-21',
    drone: 'Pyrhos X V1', // Must match drone name
    droneType: 'UAV',
    // ... other fields
  }
];
```

### To Add New Drone:
```typescript
export const drones = [
  ...drones,
  {
    id: 'UAV-003',
    name: 'New Drone Name',
    type: 'UAV', // or 'AUV'
    status: 'available',
    // ... other fields
  }
];
```

### To Add New Vessel:
```typescript
export const mockAISData = [
  ...mockAISData,
  {
    id: 'AIS-XXXXXXXXX',
    mmsi: 'XXXXXXXXX',
    name: 'VESSEL NAME',
    position: [-6.xxxx, 106.xxxx], // Near Tanjung Priok
    // ... other fields
  }
];
```

---

## 🧪 Testing Data Consistency

Run these checks to verify data consistency:

```typescript
// Check 1: All mission drones exist in fleet
missions.forEach(m => {
  const drone = getDroneByName(m.drone);
  console.assert(drone !== undefined, `Drone ${m.drone} not found!`);
});

// Check 2: Statistics match actual data
console.assert(
  missionSummary.totalMissions === missions.length,
  'Mission count mismatch!'
);

// Check 3: All detections have valid missions
aiDetections.forEach(d => {
  const mission = getMissionById(d.missionId);
  console.assert(mission !== undefined, `Mission ${d.missionId} not found!`);
});
```

---

## 📝 Migration from Old Data

If you had data in individual components, follow this pattern:

### Before (❌ Inconsistent):
```typescript
// Component A
const drones = [{ name: 'Pyrhos X V1', ... }];

// Component B  
const drones = [{ name: 'Pyrhos X V2', ... }]; // Different!
```

### After (✅ Consistent):
```typescript
// All components
import { drones } from './shared-data';
// Always same data everywhere!
```

---

## 🎨 UI Consistency

With centralized data, ensure:
- ✅ Dashboard shows: 9 total missions
- ✅ Live Ops shows: 1 active operation
- ✅ Mission History shows: 9 missions
- ✅ Asset Management shows: 4 drones
- ✅ All stats calculations match

---

## 🚀 Ready for Live Data

When switching to live APIs:

1. Keep mock data as fallback
2. API services already import from central data
3. APIs return same data structure
4. Seamless transition!

```typescript
// APIs use same format
import { mockAISData } from '../data/mock-data';

export async function fetchAISData() {
  try {
    // Try real API
    const liveData = await fetch(...);
    return liveData;
  } catch (error) {
    // Fallback to mock
    return mockAISData;
  }
}
```

---

## ✨ Benefits

1. **Single Source of Truth** - No duplicate data
2. **Easy Updates** - Change once, reflect everywhere
3. **Consistency** - All components show same numbers
4. **Type Safety** - TypeScript enforces structure
5. **Testing** - Easy to modify for tests
6. **API Ready** - Same structure as live data

---

## 📞 Questions?

If you need to add/modify data:
1. Update `/data/mock-data.ts`
2. Verify with helper functions
3. Check statistics recalculate correctly
4. Test in all components

**All data is now synchronized! 🎉**
