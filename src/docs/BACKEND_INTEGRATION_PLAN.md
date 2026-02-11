# Backend Integration Plan
## Drone Operations Management System

**Frontend:** React + TypeScript + Tailwind CSS  
**Backend:** Golang (Go)  
**Database:** PostgreSQL  
**Real-time:** WebSocket (Gorilla WebSocket)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  - Dashboard, Live Ops, Post Analysis, etc.                 │
│  - Real-time updates via WebSocket                          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ HTTP/HTTPS + WebSocket
                 │
┌────────────────┴────────────────────────────────────────────┐
│                   API Gateway (Golang)                       │
│  - RESTful API endpoints                                    │
│  - WebSocket server for real-time data                     │
│  - JWT Authentication                                        │
│  - Request validation & error handling                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │
┌────────────────┴────────────────────────────────────────────┐
│              Business Logic Layer (Golang)                   │
│  - Drone management service                                 │
│  - Mission service                                          │
│  - AI detection service                                     │
│  - Telemetry processing service                             │
│  - Video processing service                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │
┌────────────────┴────────────────────────────────────────────┐
│                  PostgreSQL Database                         │
│  - Users, Drones, Missions, Telemetry                       │
│  - AI Detections, Videos, Settings                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema Design

### 2.1 Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'Admin', 'Operator', 'Analyst', 'Technician'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
    last_active TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### 2.2 Drones Table
```sql
CREATE TABLE drones (
    id VARCHAR(50) PRIMARY KEY, -- 'UAV-001', 'AUV-001'
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL, -- 'UAV', 'AUV'
    status VARCHAR(20) DEFAULT 'available', -- 'available', 'in_flight', 'maintenance', 'retired'
    manufacturer VARCHAR(255),
    model VARCHAR(255),
    serial_number VARCHAR(255) UNIQUE,
    
    -- UAV specific
    max_altitude INTEGER, -- meters
    max_speed DECIMAL(10,2), -- m/s
    
    -- AUV specific
    max_depth INTEGER, -- meters
    
    -- Common
    battery_capacity INTEGER, -- mAh
    max_flight_time INTEGER, -- minutes (UAV) or operation_time (AUV)
    
    -- Location & metadata
    home_location JSONB, -- {lat, lng, name}
    last_maintenance_date DATE,
    total_flight_hours DECIMAL(10,2) DEFAULT 0,
    total_missions INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_drones_type ON drones(type);
CREATE INDEX idx_drones_status ON drones(status);
```

### 2.3 Missions Table
```sql
CREATE TABLE missions (
    id VARCHAR(50) PRIMARY KEY, -- 'MSN-2025-001'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    drone_id VARCHAR(50) REFERENCES drones(id),
    drone_type VARCHAR(10) NOT NULL,
    
    -- Mission details
    mission_type VARCHAR(100), -- 'Port Surveillance', 'Bridge Inspection', etc.
    location VARCHAR(255),
    location_coords JSONB, -- {lat, lng}
    
    -- Status & timing
    status VARCHAR(20) NOT NULL, -- 'planned', 'active', 'completed', 'failed', 'cancelled'
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- minutes
    
    -- Metrics
    distance DECIMAL(10,2), -- km
    max_altitude DECIMAL(10,2), -- meters (UAV) or max_depth (AUV)
    avg_speed DECIMAL(10,2), -- m/s
    
    -- AI & Detection
    ai_model VARCHAR(255),
    total_detections INTEGER DEFAULT 0,
    
    -- Personnel
    pilot_id UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    
    -- Metadata
    notes TEXT,
    weather_conditions JSONB,
    aoi_zones JSONB, -- Array of polygon coordinates
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_missions_drone_id ON missions(drone_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_start_time ON missions(start_time DESC);
CREATE INDEX idx_missions_pilot_id ON missions(pilot_id);
```

### 2.4 Telemetry Table
```sql
CREATE TABLE telemetry (
    id BIGSERIAL PRIMARY KEY,
    mission_id VARCHAR(50) REFERENCES missions(id) ON DELETE CASCADE,
    drone_id VARCHAR(50) REFERENCES drones(id),
    
    -- Timestamp
    timestamp TIMESTAMP NOT NULL,
    
    -- Position
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    altitude DECIMAL(10,2), -- meters (UAV) or depth (AUV)
    
    -- Movement
    speed DECIMAL(10,2), -- m/s
    heading DECIMAL(5,2), -- degrees (0-360)
    vertical_speed DECIMAL(10,2), -- m/s
    
    -- Battery & sensors
    battery_level DECIMAL(5,2), -- percentage
    battery_voltage DECIMAL(10,2), -- volts
    temperature DECIMAL(5,2), -- celsius
    
    -- Signal & GPS
    signal_strength INTEGER, -- percentage
    gps_satellites INTEGER,
    gps_fix_type VARCHAR(20), -- '2D', '3D', 'RTK'
    
    -- Additional sensors (UAV)
    wind_speed DECIMAL(10,2),
    wind_direction DECIMAL(5,2),
    
    -- Additional sensors (AUV)
    water_temperature DECIMAL(5,2),
    pressure DECIMAL(10,2), -- bar
    salinity DECIMAL(5,2),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_telemetry_mission_id ON telemetry(mission_id);
CREATE INDEX idx_telemetry_timestamp ON telemetry(timestamp);
CREATE INDEX idx_telemetry_drone_id ON telemetry(drone_id);

-- Partition by month for performance
CREATE TABLE telemetry_2025_01 PARTITION OF telemetry
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 2.5 AI Detections Table
```sql
CREATE TABLE ai_detections (
    id VARCHAR(50) PRIMARY KEY, -- 'DET-001'
    mission_id VARCHAR(50) REFERENCES missions(id) ON DELETE CASCADE,
    drone_id VARCHAR(50) REFERENCES drones(id),
    
    -- Detection info
    detection_type VARCHAR(100) NOT NULL, -- 'Vessel Detection', 'Hull Number Recognition', etc.
    confidence DECIMAL(5,2) NOT NULL, -- percentage
    detected_count INTEGER DEFAULT 1,
    
    -- Location
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    
    -- Image/Video
    image_url TEXT,
    video_url TEXT,
    frame_number INTEGER,
    
    -- Detection data
    detection_data JSONB, -- Bounding boxes, attributes, etc.
    attributes JSONB, -- Array of detected attributes
    
    -- AIS/ADS-B correlation
    ais_data JSONB, -- For vessel detections
    adsb_data JSONB, -- For aircraft detections
    
    -- Timestamps
    detected_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_detections_mission_id ON ai_detections(mission_id);
CREATE INDEX idx_detections_type ON ai_detections(detection_type);
CREATE INDEX idx_detections_detected_at ON ai_detections(detected_at DESC);
```

### 2.6 Videos Table
```sql
CREATE TABLE videos (
    id VARCHAR(50) PRIMARY KEY, -- 'VID-001'
    mission_id VARCHAR(50) REFERENCES missions(id),
    drone_id VARCHAR(50) REFERENCES drones(id),
    
    -- File info
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT, -- bytes
    duration INTEGER, -- seconds
    resolution VARCHAR(20), -- '1080p', '4K', etc.
    format VARCHAR(20), -- 'mp4', 'avi', etc.
    
    -- Processing status
    status VARCHAR(20) DEFAULT 'uploaded', -- 'uploaded', 'processing', 'processed', 'failed'
    processing_progress INTEGER DEFAULT 0, -- percentage
    
    -- Flight log
    has_flight_log BOOLEAN DEFAULT false,
    flight_log_path TEXT,
    
    -- Video URL (for streaming)
    stream_url TEXT,
    thumbnail_url TEXT,
    
    -- Metadata
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_videos_mission_id ON videos(mission_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_uploaded_at ON videos(uploaded_at DESC);
```

### 2.7 AI Models Table
```sql
CREATE TABLE ai_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL,
    model_type VARCHAR(100), -- 'detection', 'classification', 'segmentation'
    
    -- Configuration
    confidence_threshold DECIMAL(5,2) DEFAULT 85.0,
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive', 'training'
    
    -- Model files
    model_path TEXT,
    config_path TEXT,
    
    -- Performance metrics
    accuracy DECIMAL(5,2),
    precision_score DECIMAL(5,2),
    recall_score DECIMAL(5,2),
    
    -- Metadata
    description TEXT,
    last_updated TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_models_status ON ai_models(status);
```

### 2.8 AIS Data Table (Live tracking)
```sql
CREATE TABLE ais_data (
    id BIGSERIAL PRIMARY KEY,
    mmsi VARCHAR(20) NOT NULL,
    
    -- Vessel info
    vessel_name VARCHAR(255),
    vessel_type VARCHAR(100),
    call_sign VARCHAR(20),
    imo_number VARCHAR(20),
    
    -- Position
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    
    -- Movement
    speed DECIMAL(5,2), -- knots
    course DECIMAL(5,2), -- degrees
    heading DECIMAL(5,2), -- degrees
    
    -- Vessel details
    length DECIMAL(10,2), -- meters
    width DECIMAL(10,2), -- meters
    draft DECIMAL(5,2), -- meters
    destination VARCHAR(255),
    eta TIMESTAMP,
    
    -- Timestamp
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ais_mmsi ON ais_data(mmsi);
CREATE INDEX idx_ais_timestamp ON ais_data(timestamp DESC);
CREATE INDEX idx_ais_location ON ais_data USING GIST (
    ll_to_earth(latitude, longitude)
);
```

### 2.9 ADS-B Data Table (Live tracking)
```sql
CREATE TABLE adsb_data (
    id BIGSERIAL PRIMARY KEY,
    icao24 VARCHAR(20) NOT NULL,
    
    -- Aircraft info
    call_sign VARCHAR(20),
    registration VARCHAR(20),
    aircraft_type VARCHAR(100),
    
    -- Position
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    altitude DECIMAL(10,2), -- meters
    
    -- Movement
    speed DECIMAL(10,2), -- m/s
    heading DECIMAL(5,2), -- degrees
    vertical_rate DECIMAL(10,2), -- m/s
    
    -- Additional
    squawk VARCHAR(10),
    on_ground BOOLEAN DEFAULT false,
    
    -- Timestamp
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_adsb_icao24 ON adsb_data(icao24);
CREATE INDEX idx_adsb_timestamp ON adsb_data(timestamp DESC);
CREATE INDEX idx_adsb_location ON adsb_data USING GIST (
    ll_to_earth(latitude, longitude)
);
```

### 2.10 System Settings Table
```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    category VARCHAR(100) NOT NULL, -- 'theme', 'ai', 'notifications', etc.
    key VARCHAR(100) NOT NULL,
    value JSONB NOT NULL,
    user_id UUID REFERENCES users(id), -- NULL for system-wide settings
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(category, key, user_id)
);

CREATE INDEX idx_settings_category ON system_settings(category);
CREATE INDEX idx_settings_user_id ON system_settings(user_id);
```

---

## 3. API Endpoints Design

### Base URL: `http://localhost:8080/api/v1`

### 3.1 Authentication Endpoints

#### POST /auth/register
Register new user account
```json
Request:
{
  "email": "pilot@droneops.io",
  "password": "securepassword",
  "full_name": "John Pilot",
  "role": "Operator"
}

Response (201):
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": "uuid",
    "email": "pilot@droneops.io",
    "full_name": "John Pilot",
    "role": "Operator"
  }
}
```

#### POST /auth/login
Login and get JWT token
```json
Request:
{
  "email": "pilot@droneops.io",
  "password": "securepassword"
}

Response (200):
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "refresh_token_here",
    "expires_in": 3600,
    "user": {
      "id": "uuid",
      "email": "pilot@droneops.io",
      "full_name": "John Pilot",
      "role": "Operator"
    }
  }
}
```

#### POST /auth/refresh
Refresh access token
```json
Request:
{
  "refresh_token": "refresh_token_here"
}

Response (200):
{
  "success": true,
  "data": {
    "token": "new_jwt_token",
    "expires_in": 3600
  }
}
```

#### POST /auth/logout
Logout user
```json
Headers:
Authorization: Bearer {token}

Response (200):
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 3.2 Drone Endpoints

#### GET /drones
Get all drones
```json
Query params:
- type: UAV | AUV
- status: available | in_flight | maintenance | retired
- page: 1
- limit: 20

Response (200):
{
  "success": true,
  "data": {
    "drones": [
      {
        "id": "UAV-001",
        "name": "Pyrhos X V1",
        "type": "UAV",
        "status": "available",
        "max_altitude": 150,
        "max_speed": 20,
        "battery_capacity": 22000,
        "max_flight_time": 45,
        "total_flight_hours": 127.5,
        "total_missions": 23,
        "last_maintenance_date": "2025-01-15"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 4
    }
  }
}
```

#### GET /drones/:id
Get specific drone details
```json
Response (200):
{
  "success": true,
  "data": {
    "id": "UAV-001",
    "name": "Pyrhos X V1",
    "type": "UAV",
    "status": "available",
    "manufacturer": "DJI",
    "model": "Phantom X",
    "serial_number": "PX-2024-001",
    "max_altitude": 150,
    "max_speed": 20,
    "battery_capacity": 22000,
    "max_flight_time": 45,
    "home_location": {
      "lat": -6.2088,
      "lng": 106.8456,
      "name": "Jakarta Base"
    },
    "total_flight_hours": 127.5,
    "total_missions": 23,
    "last_maintenance_date": "2025-01-15",
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2025-01-20T10:00:00Z"
  }
}
```

#### POST /drones
Create new drone
```json
Request:
{
  "id": "UAV-003",
  "name": "New Drone",
  "type": "UAV",
  "manufacturer": "DJI",
  "model": "Mavic 3",
  "serial_number": "MV3-2025-001",
  "max_altitude": 120,
  "max_speed": 18,
  "battery_capacity": 15000,
  "max_flight_time": 40,
  "home_location": {
    "lat": -6.2088,
    "lng": 106.8456,
    "name": "Jakarta Base"
  }
}

Response (201):
{
  "success": true,
  "message": "Drone created successfully",
  "data": { /* drone object */ }
}
```

#### PUT /drones/:id
Update drone parameters
```json
Request:
{
  "max_altitude": 150,
  "max_speed": 20,
  "status": "maintenance"
}

Response (200):
{
  "success": true,
  "message": "Drone updated successfully",
  "data": { /* updated drone object */ }
}
```

#### DELETE /drones/:id
Delete drone
```json
Response (200):
{
  "success": true,
  "message": "Drone deleted successfully"
}
```

---

### 3.3 Mission Endpoints

#### GET /missions
Get all missions
```json
Query params:
- status: planned | active | completed | failed | cancelled
- drone_id: UAV-001
- drone_type: UAV | AUV
- start_date: 2025-01-01
- end_date: 2025-01-31
- page: 1
- limit: 20

Response (200):
{
  "success": true,
  "data": {
    "missions": [
      {
        "id": "MSN-2025-001",
        "name": "Port Surveillance - Morning Patrol",
        "description": "Daily port surveillance",
        "drone_id": "UAV-001",
        "drone_type": "UAV",
        "mission_type": "Port Surveillance",
        "location": "Tanjung Priok",
        "status": "completed",
        "start_time": "2025-01-20T06:00:00Z",
        "end_time": "2025-01-20T06:45:00Z",
        "duration": 45,
        "distance": 12.5,
        "max_altitude": 128,
        "ai_model": "YOLOv8-maritime",
        "total_detections": 88,
        "pilot_id": "uuid",
        "created_at": "2025-01-19T15:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156
    }
  }
}
```

#### GET /missions/:id
Get mission details
```json
Response (200):
{
  "success": true,
  "data": {
    "mission": { /* full mission object */ },
    "telemetry_summary": {
      "total_points": 2700,
      "avg_altitude": 115.3,
      "max_altitude": 128,
      "avg_speed": 12.3,
      "max_speed": 18.5,
      "distance_covered": 12.5
    },
    "detections_summary": {
      "total": 88,
      "by_type": {
        "Vessel Detection": 23,
        "Hull Number Recognition": 18,
        "Vessel Attributes": 47
      }
    },
    "video": {
      "id": "VID-001",
      "file_name": "mission_recording.mp4",
      "duration": 2700,
      "size": 2400000000,
      "stream_url": "https://..."
    }
  }
}
```

#### POST /missions
Create new mission
```json
Request:
{
  "name": "New Mission",
  "description": "Mission description",
  "drone_id": "UAV-001",
  "mission_type": "Port Surveillance",
  "location": "Jakarta Harbor",
  "location_coords": {
    "lat": -6.1064,
    "lng": 106.8818
  },
  "planned_start_time": "2025-01-21T06:00:00Z",
  "pilot_id": "uuid",
  "ai_model": "YOLOv8-maritime",
  "aoi_zones": [
    {
      "name": "Zone A",
      "coordinates": [
        {"lat": -6.1064, "lng": 106.8818},
        {"lat": -6.1074, "lng": 106.8828},
        {"lat": -6.1084, "lng": 106.8808}
      ]
    }
  ]
}

Response (201):
{
  "success": true,
  "message": "Mission created successfully",
  "data": {
    "mission_id": "MSN-2025-157",
    /* mission object */
  }
}
```

#### PUT /missions/:id
Update mission
```json
Request:
{
  "status": "active",
  "start_time": "2025-01-21T06:00:00Z"
}

Response (200):
{
  "success": true,
  "message": "Mission updated successfully",
  "data": { /* updated mission */ }
}
```

#### DELETE /missions/:id
Delete mission
```json
Response (200):
{
  "success": true,
  "message": "Mission deleted successfully"
}
```

---

### 3.4 Telemetry Endpoints

#### GET /missions/:id/telemetry
Get mission telemetry data
```json
Query params:
- start_time: 2025-01-20T06:00:00Z
- end_time: 2025-01-20T06:45:00Z
- interval: 1 (seconds)
- limit: 1000

Response (200):
{
  "success": true,
  "data": {
    "mission_id": "MSN-2025-001",
    "telemetry": [
      {
        "timestamp": "2025-01-20T06:00:01Z",
        "latitude": -6.1064,
        "longitude": 106.8818,
        "altitude": 127.5,
        "speed": 12.3,
        "heading": 145.5,
        "battery_level": 98.5,
        "signal_strength": 95,
        "gps_satellites": 14
      }
    ],
    "summary": {
      "total_points": 2700,
      "duration": 2700
    }
  }
}
```

#### POST /missions/:id/telemetry
Add telemetry data (bulk insert)
```json
Request:
{
  "telemetry": [
    {
      "timestamp": "2025-01-20T06:00:01Z",
      "latitude": -6.1064,
      "longitude": 106.8818,
      "altitude": 127.5,
      "speed": 12.3,
      "heading": 145.5,
      "battery_level": 98.5,
      "signal_strength": 95,
      "gps_satellites": 14
    }
  ]
}

Response (201):
{
  "success": true,
  "message": "Telemetry data added successfully",
  "data": {
    "inserted_count": 1
  }
}
```

---

### 3.5 AI Detection Endpoints

#### GET /detections
Get all AI detections
```json
Query params:
- mission_id: MSN-2025-001
- detection_type: Vessel Detection | Hull Number Recognition
- min_confidence: 85
- start_date: 2025-01-01
- end_date: 2025-01-31
- page: 1
- limit: 20

Response (200):
{
  "success": true,
  "data": {
    "detections": [
      {
        "id": "DET-001",
        "mission_id": "MSN-2025-001",
        "detection_type": "Vessel Detection",
        "confidence": 96.5,
        "detected_count": 23,
        "latitude": -6.1064,
        "longitude": 106.8818,
        "image_url": "https://...",
        "detection_data": {
          "bounding_boxes": [],
          "vessel_types": ["cargo", "tanker"]
        },
        "ais_data": {
          "mmsi": "123456789",
          "vessel_name": "Cargo Ship",
          "correlation": "matched"
        },
        "detected_at": "2025-01-20T06:15:30Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 88
    }
  }
}
```

#### GET /missions/:id/detections
Get detections for specific mission
```json
Response (200):
{
  "success": true,
  "data": {
    "mission_id": "MSN-2025-001",
    "detections": [ /* array of detections */ ],
    "summary": {
      "total": 88,
      "by_type": {
        "Vessel Detection": 23,
        "Hull Number Recognition": 18,
        "Vessel Attributes": 47
      },
      "avg_confidence": 92.3
    }
  }
}
```

#### POST /detections
Create new detection
```json
Request:
{
  "mission_id": "MSN-2025-001",
  "drone_id": "UAV-001",
  "detection_type": "Vessel Detection",
  "confidence": 96.5,
  "detected_count": 1,
  "latitude": -6.1064,
  "longitude": 106.8818,
  "image_url": "https://...",
  "detection_data": {
    "bounding_boxes": [
      {"x": 100, "y": 200, "width": 150, "height": 200}
    ]
  },
  "detected_at": "2025-01-20T06:15:30Z"
}

Response (201):
{
  "success": true,
  "message": "Detection created successfully",
  "data": { /* detection object */ }
}
```

---

### 3.6 Video Endpoints

#### GET /videos
Get all videos
```json
Query params:
- mission_id: MSN-2025-001
- drone_id: UAV-001
- status: uploaded | processing | processed | failed
- page: 1
- limit: 20

Response (200):
{
  "success": true,
  "data": {
    "videos": [
      {
        "id": "VID-001",
        "mission_id": "MSN-2025-001",
        "drone_id": "UAV-001",
        "file_name": "mission_recording.mp4",
        "file_size": 2400000000,
        "duration": 2700,
        "resolution": "1080p",
        "format": "mp4",
        "status": "processed",
        "has_flight_log": true,
        "stream_url": "https://...",
        "thumbnail_url": "https://...",
        "uploaded_at": "2025-01-20T07:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45
    }
  }
}
```

#### POST /videos/upload
Upload video file
```
Content-Type: multipart/form-data

FormData:
- video: (file)
- drone_type: UAV
- flight_log: (file, optional for UAV)
- metadata: {
    "mission_id": "MSN-2025-001", (optional)
    "drone_id": "UAV-001"
  }

Response (201):
{
  "success": true,
  "message": "Video uploaded successfully",
  "data": {
    "video_id": "VID-002",
    "upload_progress": 100,
    "processing_status": "queued"
  }
}
```

#### GET /videos/:id/stream
Stream video
```
Response (200):
Content-Type: video/mp4
Stream video content
```

#### POST /videos/:id/process
Trigger video processing
```json
Request:
{
  "process_telemetry": true,
  "extract_frames": true,
  "run_ai_detection": true
}

Response (202):
{
  "success": true,
  "message": "Video processing started",
  "data": {
    "job_id": "job-uuid",
    "status": "processing"
  }
}
```

#### GET /videos/:id/progress
Get processing progress
```json
Response (200):
{
  "success": true,
  "data": {
    "video_id": "VID-002",
    "status": "processing",
    "progress": 45,
    "current_step": "AI detection",
    "estimated_time_remaining": 120
  }
}
```

---

### 3.7 AIS/ADS-B Endpoints

#### GET /ais/live
Get live AIS data
```json
Query params:
- bounds: -6.2,-6.0,106.7,106.9 (south,north,west,east)
- max_age: 300 (seconds)

Response (200):
{
  "success": true,
  "data": {
    "vessels": [
      {
        "mmsi": "123456789",
        "vessel_name": "Cargo Ship Alpha",
        "vessel_type": "cargo",
        "latitude": -6.1064,
        "longitude": 106.8818,
        "speed": 8.5,
        "course": 145,
        "heading": 145,
        "destination": "SINGAPORE",
        "eta": "2025-01-21T12:00:00Z",
        "timestamp": "2025-01-20T10:00:00Z"
      }
    ],
    "count": 15,
    "last_updated": "2025-01-20T10:00:05Z"
  }
}
```

#### GET /adsb/live
Get live ADS-B data
```json
Query params:
- bounds: -6.2,-6.0,106.7,106.9
- max_age: 60 (seconds)

Response (200):
{
  "success": true,
  "data": {
    "aircraft": [
      {
        "icao24": "ABC123",
        "call_sign": "GA123",
        "latitude": -6.1200,
        "longitude": 106.6500,
        "altitude": 3500,
        "speed": 250,
        "heading": 90,
        "vertical_rate": 5.2,
        "on_ground": false,
        "timestamp": "2025-01-20T10:00:00Z"
      }
    ],
    "count": 8,
    "last_updated": "2025-01-20T10:00:05Z"
  }
}
```

---

### 3.8 User Management Endpoints

#### GET /users
Get all users (Admin only)
```json
Query params:
- role: Admin | Operator | Analyst | Technician
- status: active | inactive
- page: 1
- limit: 20

Response (200):
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "pilot@droneops.io",
        "full_name": "John Pilot",
        "role": "Operator",
        "status": "active",
        "last_active": "2025-01-20T10:00:00Z",
        "created_at": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12
    }
  }
}
```

#### GET /users/:id
Get user details
```json
Response (200):
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "pilot@droneops.io",
    "full_name": "John Pilot",
    "role": "Operator",
    "status": "active",
    "last_active": "2025-01-20T10:00:00Z",
    "total_missions": 45,
    "total_flight_hours": 127.5,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

#### PUT /users/:id
Update user
```json
Request:
{
  "full_name": "John Senior Pilot",
  "role": "Admin",
  "status": "active"
}

Response (200):
{
  "success": true,
  "message": "User updated successfully",
  "data": { /* updated user */ }
}
```

#### DELETE /users/:id
Delete user
```json
Response (200):
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### 3.9 Settings Endpoints

#### GET /settings
Get user settings
```json
Query params:
- category: theme | ai | notifications

Response (200):
{
  "success": true,
  "data": {
    "settings": [
      {
        "category": "theme",
        "key": "colors",
        "value": {
          "primary": "#21A68D",
          "secondary": "#0F4C75",
          "warning": "#D4E268",
          "success": "#22c55e",
          "danger": "#ef4444"
        }
      }
    ]
  }
}
```

#### PUT /settings
Update settings
```json
Request:
{
  "category": "theme",
  "key": "colors",
  "value": {
    "primary": "#FF5733"
  }
}

Response (200):
{
  "success": true,
  "message": "Settings updated successfully",
  "data": { /* updated settings */ }
}
```

---

### 3.10 Dashboard & Analytics Endpoints

#### GET /dashboard/summary
Get dashboard summary
```json
Response (200):
{
  "success": true,
  "data": {
    "active_missions": 2,
    "total_drones": 4,
    "available_drones": 2,
    "today_missions": 5,
    "total_detections_today": 234,
    "system_health": {
      "status": "healthy",
      "uptime": 99.8
    }
  }
}
```

#### GET /analytics/missions
Get mission analytics
```json
Query params:
- start_date: 2025-01-01
- end_date: 2025-01-31
- group_by: day | week | month

Response (200):
{
  "success": true,
  "data": {
    "total_missions": 156,
    "completed": 145,
    "failed": 5,
    "cancelled": 6,
    "total_flight_hours": 1245.5,
    "total_distance": 3420.8,
    "by_date": [
      {
        "date": "2025-01-20",
        "missions": 8,
        "flight_hours": 67.2,
        "detections": 456
      }
    ]
  }
}
```

---

## 4. WebSocket Integration

### 4.1 WebSocket Endpoint

**URL:** `ws://localhost:8080/ws`

**Authentication:** Send JWT token in first message or via query param `?token=<jwt>`

### 4.2 Message Format

```json
// Client → Server (Subscribe)
{
  "action": "subscribe",
  "channel": "telemetry",
  "mission_id": "MSN-2025-001"
}

// Server → Client (Telemetry Update)
{
  "channel": "telemetry",
  "mission_id": "MSN-2025-001",
  "data": {
    "timestamp": "2025-01-20T10:00:01Z",
    "latitude": -6.1064,
    "longitude": 106.8818,
    "altitude": 127.5,
    "speed": 12.3,
    "battery_level": 95.5
  }
}

// Client → Server (Unsubscribe)
{
  "action": "unsubscribe",
  "channel": "telemetry",
  "mission_id": "MSN-2025-001"
}
```

### 4.3 Available Channels

1. **telemetry** - Real-time drone telemetry
2. **detections** - AI detection alerts
3. **ais** - Live AIS vessel tracking
4. **adsb** - Live ADS-B aircraft tracking
5. **system** - System notifications

### 4.4 Frontend WebSocket Implementation

```typescript
// /services/websocket.ts
class WebSocketService {
  private ws: WebSocket | null = null;
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  connect() {
    this.ws = new WebSocket(`ws://localhost:8080/ws?token=${this.token}`);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect logic
      setTimeout(() => this.connect(), 3000);
    };
  }

  subscribe(channel: string, id?: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        channel,
        mission_id: id
      }));
    }
  }

  unsubscribe(channel: string, id?: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'unsubscribe',
        channel,
        mission_id: id
      }));
    }
  }

  private handleMessage(data: any) {
    // Emit events based on channel
    switch (data.channel) {
      case 'telemetry':
        window.dispatchEvent(new CustomEvent('telemetry-update', { detail: data.data }));
        break;
      case 'detections':
        window.dispatchEvent(new CustomEvent('detection-alert', { detail: data.data }));
        break;
      // ... other channels
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default WebSocketService;
```

---

## 5. Golang Backend Structure

### 5.1 Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point
├── internal/
│   ├── api/
│   │   ├── handlers/               # HTTP handlers
│   │   │   ├── auth.go
│   │   │   ├── drone.go
│   │   │   ├── mission.go
│   │   │   ├── telemetry.go
│   │   │   ├── detection.go
│   │   │   ├── video.go
│   │   │   └── user.go
│   │   ├── middleware/             # Middlewares
│   │   │   ├── auth.go
│   │   │   ├── cors.go
│   │   │   ├── logger.go
│   │   │   └── rate_limit.go
│   │   └── routes.go               # Route definitions
│   ├── models/                     # Data models
│   │   ├── user.go
│   │   ├── drone.go
│   │   ├── mission.go
│   │   ├── telemetry.go
│   │   └── detection.go
│   ├── repository/                 # Database layer
│   │   ├── user_repo.go
│   │   ├── drone_repo.go
│   │   ├── mission_repo.go
│   │   └── postgres.go
│   ├── service/                    # Business logic
│   │   ├── auth_service.go
│   │   ├── drone_service.go
│   │   ├── mission_service.go
│   │   ├── video_service.go
│   │   └── ai_service.go
│   ├── websocket/                  # WebSocket server
│   │   ├── hub.go
│   │   ├── client.go
│   │   └── handlers.go
│   ├── config/                     # Configuration
│   │   └── config.go
│   └── utils/                      # Utilities
│       ├── jwt.go
│       ├── validator.go
│       ├── response.go
│       └── errors.go
├── pkg/                            # Public packages
│   ├── ais/                        # AIS integration
│   ├── adsb/                       # ADS-B integration
│   └── storage/                    # File storage (S3/local)
├── migrations/                     # Database migrations
│   ├── 001_create_users.up.sql
│   ├── 001_create_users.down.sql
│   ├── 002_create_drones.up.sql
│   └── ...
├── scripts/                        # Utility scripts
├── .env.example
├── go.mod
├── go.sum
├── Makefile
└── README.md
```

### 5.2 Main Dependencies

```go
// go.mod
module github.com/yourorg/drone-ops-backend

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1                  // HTTP framework
    github.com/gorilla/websocket v1.5.1              // WebSocket
    github.com/lib/pq v1.10.9                        // PostgreSQL driver
    github.com/jmoiron/sqlx v1.3.5                   // SQL extensions
    github.com/golang-jwt/jwt/v5 v5.2.0              // JWT
    github.com/go-playground/validator/v10 v10.16.0  // Validation
    github.com/joho/godotenv v1.5.1                  // Environment variables
    github.com/sirupsen/logrus v1.9.3                // Logging
    github.com/aws/aws-sdk-go v1.48.0                // AWS SDK (S3)
    golang.org/x/crypto v0.17.0                      // Crypto (bcrypt)
    github.com/redis/go-redis/v9 v9.4.0              // Redis (caching)
    github.com/robfig/cron/v3 v3.0.1                 // Cron jobs
)
```

### 5.3 Configuration (.env)

```env
# Server
SERVER_PORT=8080
SERVER_HOST=0.0.0.0
ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=drone_ops
DB_SSLMODE=disable

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRY=3600
JWT_REFRESH_SECRET=your-refresh-token-secret
JWT_REFRESH_EXPIRY=604800

# AWS S3 (Video Storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
S3_BUCKET_NAME=drone-ops-videos
S3_BUCKET_REGION=us-east-1

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# AIS API (example: MarineTraffic, AISHub)
AIS_API_URL=https://api.ais-provider.com
AIS_API_KEY=your-ais-api-key

# ADS-B API (example: OpenSky Network)
ADSB_API_URL=https://opensky-network.org/api
ADSB_API_USER=username
ADSB_API_PASS=password

# AI Processing
AI_API_URL=http://localhost:5000
AI_API_KEY=your-ai-api-key

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

### 5.4 Sample Handler (drone.go)

```go
// internal/api/handlers/drone.go
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/yourorg/drone-ops-backend/internal/service"
    "github.com/yourorg/drone-ops-backend/internal/models"
)

type DroneHandler struct {
    droneService *service.DroneService
}

func NewDroneHandler(ds *service.DroneService) *DroneHandler {
    return &DroneHandler{
        droneService: ds,
    }
}

// GET /api/v1/drones
func (h *DroneHandler) GetDrones(c *gin.Context) {
    droneType := c.Query("type")
    status := c.Query("status")
    page := c.DefaultQuery("page", "1")
    limit := c.DefaultQuery("limit", "20")

    drones, total, err := h.droneService.GetDrones(droneType, status, page, limit)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "drones": drones,
            "pagination": gin.H{
                "page": page,
                "limit": limit,
                "total": total,
            },
        },
    })
}

// GET /api/v1/drones/:id
func (h *DroneHandler) GetDrone(c *gin.Context) {
    id := c.Param("id")

    drone, err := h.droneService.GetDroneByID(id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{
            "success": false,
            "error": "Drone not found",
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": drone,
    })
}

// POST /api/v1/drones
func (h *DroneHandler) CreateDrone(c *gin.Context) {
    var drone models.Drone

    if err := c.ShouldBindJSON(&drone); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": err.Error(),
        })
        return
    }

    if err := h.droneService.CreateDrone(&drone); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusCreated, gin.H{
        "success": true,
        "message": "Drone created successfully",
        "data": drone,
    })
}

// PUT /api/v1/drones/:id
func (h *DroneHandler) UpdateDrone(c *gin.Context) {
    id := c.Param("id")
    var updates map[string]interface{}

    if err := c.ShouldBindJSON(&updates); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": err.Error(),
        })
        return
    }

    drone, err := h.droneService.UpdateDrone(id, updates)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Drone updated successfully",
        "data": drone,
    })
}

// DELETE /api/v1/drones/:id
func (h *DroneHandler) DeleteDrone(c *gin.Context) {
    id := c.Param("id")

    if err := h.droneService.DeleteDrone(id); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "success": false,
            "error": err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "Drone deleted successfully",
    })
}
```

### 5.5 Sample Service (drone_service.go)

```go
// internal/service/drone_service.go
package service

import (
    "github.com/yourorg/drone-ops-backend/internal/models"
    "github.com/yourorg/drone-ops-backend/internal/repository"
)

type DroneService struct {
    droneRepo *repository.DroneRepository
}

func NewDroneService(dr *repository.DroneRepository) *DroneService {
    return &DroneService{
        droneRepo: dr,
    }
}

func (s *DroneService) GetDrones(droneType, status, page, limit string) ([]models.Drone, int, error) {
    return s.droneRepo.FindAll(droneType, status, page, limit)
}

func (s *DroneService) GetDroneByID(id string) (*models.Drone, error) {
    return s.droneRepo.FindByID(id)
}

func (s *DroneService) CreateDrone(drone *models.Drone) error {
    // Business logic validation
    if drone.Type != "UAV" && drone.Type != "AUV" {
        return fmt.Errorf("invalid drone type")
    }

    return s.droneRepo.Create(drone)
}

func (s *DroneService) UpdateDrone(id string, updates map[string]interface{}) (*models.Drone, error) {
    // Validate updates
    if err := s.validateUpdates(updates); err != nil {
        return nil, err
    }

    return s.droneRepo.Update(id, updates)
}

func (s *DroneService) DeleteDrone(id string) error {
    // Check if drone has active missions
    hasActiveMissions, err := s.droneRepo.HasActiveMissions(id)
    if err != nil {
        return err
    }
    if hasActiveMissions {
        return fmt.Errorf("cannot delete drone with active missions")
    }

    return s.droneRepo.Delete(id)
}

func (s *DroneService) validateUpdates(updates map[string]interface{}) error {
    // Add validation logic
    return nil
}
```

---

## 6. Frontend Integration Steps

### 6.1 Create API Service Layer

```typescript
// /services/api.ts
import axios, { AxiosInstance, AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor (add JWT token)
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor (handle errors)
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle token expiration
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth
  async login(email: string, password: string) {
    return this.client.post('/auth/login', { email, password });
  }

  async register(data: any) {
    return this.client.post('/auth/register', data);
  }

  async logout() {
    return this.client.post('/auth/logout');
  }

  // Drones
  async getDrones(params?: any) {
    return this.client.get('/drones', { params });
  }

  async getDrone(id: string) {
    return this.client.get(`/drones/${id}`);
  }

  async createDrone(data: any) {
    return this.client.post('/drones', data);
  }

  async updateDrone(id: string, data: any) {
    return this.client.put(`/drones/${id}`, data);
  }

  async deleteDrone(id: string) {
    return this.client.delete(`/drones/${id}`);
  }

  // Missions
  async getMissions(params?: any) {
    return this.client.get('/missions', { params });
  }

  async getMission(id: string) {
    return this.client.get(`/missions/${id}`);
  }

  async createMission(data: any) {
    return this.client.post('/missions', data);
  }

  async updateMission(id: string, data: any) {
    return this.client.put(`/missions/${id}`, data);
  }

  async deleteMission(id: string) {
    return this.client.delete(`/missions/${id}`);
  }

  // Telemetry
  async getTelemetry(missionId: string, params?: any) {
    return this.client.get(`/missions/${missionId}/telemetry`, { params });
  }

  async addTelemetry(missionId: string, data: any) {
    return this.client.post(`/missions/${missionId}/telemetry`, data);
  }

  // Detections
  async getDetections(params?: any) {
    return this.client.get('/detections', { params });
  }

  async getMissionDetections(missionId: string) {
    return this.client.get(`/missions/${missionId}/detections`);
  }

  async createDetection(data: any) {
    return this.client.post('/detections', data);
  }

  // Videos
  async getVideos(params?: any) {
    return this.client.get('/videos', { params });
  }

  async uploadVideo(formData: FormData, onProgress?: (progress: number) => void) {
    return this.client.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  async processVideo(videoId: string, options: any) {
    return this.client.post(`/videos/${videoId}/process`, options);
  }

  async getVideoProgress(videoId: string) {
    return this.client.get(`/videos/${videoId}/progress`);
  }

  // AIS/ADS-B
  async getLiveAIS(bounds: string) {
    return this.client.get('/ais/live', { params: { bounds } });
  }

  async getLiveADSB(bounds: string) {
    return this.client.get('/adsb/live', { params: { bounds } });
  }

  // Dashboard
  async getDashboardSummary() {
    return this.client.get('/dashboard/summary');
  }

  async getMissionAnalytics(params?: any) {
    return this.client.get('/analytics/missions', { params });
  }

  // Users
  async getUsers(params?: any) {
    return this.client.get('/users', { params });
  }

  async getUser(id: string) {
    return this.client.get(`/users/${id}`);
  }

  async updateUser(id: string, data: any) {
    return this.client.put(`/users/${id}`, data);
  }

  async deleteUser(id: string) {
    return this.client.delete(`/users/${id}`);
  }

  // Settings
  async getSettings(category?: string) {
    return this.client.get('/settings', { params: { category } });
  }

  async updateSettings(data: any) {
    return this.client.put('/settings', data);
  }
}

export default new ApiService();
```

### 6.2 Update Mock Data Files

Replace mock data imports in components with API calls:

```typescript
// Before
import { missions } from './shared-data';

// After
import { useEffect, useState } from 'react';
import api from '../services/api';

function Component() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        const response = await api.getMissions();
        setMissions(response.data.missions);
      } catch (error) {
        console.error('Error fetching missions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMissions();
  }, []);

  if (loading) return <div>Loading...</div>;

  return <div>{/* Render missions */}</div>;
}
```

### 6.3 Environment Variables

Create `.env` file in frontend:

```env
VITE_API_URL=http://localhost:8080/api/v1
VITE_WS_URL=ws://localhost:8080/ws
VITE_STORAGE_URL=https://your-s3-bucket.s3.amazonaws.com
```

---

## 7. Deployment Strategy

### 7.1 Development Environment

```bash
# Backend
cd backend
go run cmd/server/main.go

# Frontend
cd frontend
npm run dev
```

### 7.2 Production Deployment

#### Backend (Docker)

```dockerfile
# backend/Dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /drone-ops-server ./cmd/server

FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

COPY --from=builder /drone-ops-server .
COPY --from=builder /app/.env .

EXPOSE 8080

CMD ["./drone-ops-server"]
```

#### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: drone_ops
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis
    environment:
      DB_HOST: postgres
      REDIS_HOST: redis
    volumes:
      - ./backend/.env:/root/.env

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

---

## 8. Testing Strategy

### 8.1 Backend Tests

```go
// internal/service/drone_service_test.go
package service

import (
    "testing"
    "github.com/stretchr/testify/assert"
)

func TestGetDrones(t *testing.T) {
    // Setup
    repo := &mockDroneRepository{}
    service := NewDroneService(repo)

    // Execute
    drones, total, err := service.GetDrones("UAV", "available", "1", "20")

    // Assert
    assert.NoError(t, err)
    assert.NotNil(t, drones)
    assert.Greater(t, total, 0)
}
```

### 8.2 API Tests

```bash
# Install newman for API testing
npm install -g newman

# Run Postman collection
newman run drone-ops-api.postman_collection.json
```

---

## 9. Security Best Practices

1. **Authentication**
   - JWT with short expiry (1 hour)
   - Refresh tokens with longer expiry
   - HttpOnly cookies for tokens

2. **Authorization**
   - Role-based access control (RBAC)
   - Middleware for route protection

3. **Data Validation**
   - Input validation on all endpoints
   - SQL injection prevention (use parameterized queries)

4. **CORS**
   - Configure allowed origins
   - Whitelist frontend URLs

5. **Rate Limiting**
   - Protect against DDoS
   - Per-user rate limits

6. **HTTPS**
   - Use TLS in production
   - Redirect HTTP to HTTPS

7. **Environment Variables**
   - Never commit secrets
   - Use secret management services

---

## 10. Migration Steps

### Phase 1: Infrastructure Setup (Week 1)
- [ ] Setup PostgreSQL database
- [ ] Create database schema
- [ ] Setup Redis for caching
- [ ] Configure AWS S3 for video storage

### Phase 2: Backend Development (Week 2-4)
- [ ] Implement authentication system
- [ ] Create CRUD APIs for drones, missions, users
- [ ] Implement telemetry endpoints
- [ ] Build WebSocket server
- [ ] Integrate AIS/ADS-B APIs

### Phase 3: Frontend Integration (Week 5-6)
- [ ] Create API service layer
- [ ] Replace mock data with API calls
- [ ] Implement WebSocket client
- [ ] Add authentication flow
- [ ] Handle loading and error states

### Phase 4: Video Processing (Week 7)
- [ ] Implement video upload
- [ ] Build video processing pipeline
- [ ] Integrate AI detection service
- [ ] Create video streaming endpoint

### Phase 5: Testing (Week 8)
- [ ] Unit tests
- [ ] Integration tests
- [ ] API tests
- [ ] Load testing

### Phase 6: Deployment (Week 9)
- [ ] Setup Docker containers
- [ ] Configure CI/CD pipeline
- [ ] Deploy to staging environment
- [ ] Production deployment

---

## 11. Monitoring & Logging

### 11.1 Logging

```go
// Use structured logging
import "github.com/sirupsen/logrus"

log.WithFields(logrus.Fields{
    "mission_id": missionID,
    "drone_id": droneID,
    "action": "telemetry_update",
}).Info("Telemetry data received")
```

### 11.2 Metrics

- Response times
- Error rates
- Active connections
- Database query performance

### 11.3 Monitoring Tools

- **Prometheus** - Metrics collection
- **Grafana** - Visualization
- **ELK Stack** - Log aggregation
- **Sentry** - Error tracking

---

## 12. Performance Optimization

1. **Database**
   - Proper indexing
   - Query optimization
   - Connection pooling
   - Partitioning large tables

2. **Caching**
   - Redis for frequently accessed data
   - Cache mission summaries
   - Cache user settings

3. **API**
   - Pagination for large datasets
   - Compression (gzip)
   - CDN for static assets

4. **WebSocket**
   - Efficient message batching
   - Heartbeat for connection health
   - Auto-reconnection

---

## 13. Future Enhancements

1. **Real-time Collaboration**
   - Multiple operators viewing same mission
   - Shared annotations

2. **Advanced Analytics**
   - Machine learning predictions
   - Anomaly detection

3. **Mobile App**
   - iOS/Android apps
   - Offline mode

4. **Integration**
   - Third-party drone SDKs
   - Weather APIs
   - Map providers

---

## Contact & Support

For questions or issues during integration:
- Email: devops@droneops.io
- Documentation: https://docs.droneops.io
- Issue Tracker: https://github.com/yourorg/drone-ops/issues

---

**Last Updated:** January 20, 2025  
**Version:** 1.0.0
