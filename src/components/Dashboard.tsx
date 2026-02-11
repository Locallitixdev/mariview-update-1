import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { MapPin, AlertTriangle, TrendingUp, Target, Eye, Calendar, Ship, Radio, Cloud, Wind, Clock } from 'lucide-react';
import { useState, useEffect, useRef, useMemo } from 'react';

import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { missions, missionSummary, aiDetections, liveOperations, mockAISData, mockADSBData, mockENCData, mockGeofences, mockWeatherData } from './shared-data';
import LeafletMap from './LeafletMap';
import MapOverlayControls from './MapOverlayControls';
import vesselDetectionImg from '../assets/vessel_detection.png';
import hullNumberImg from '../assets/hull_number.png';
import vesselAttributeImg from '../assets/vessel_attribute.png';

// AI Detection results with images
const detectionResults = [
  {
    id: 1,
    type: 'Vessel Detection',
    mission: 'PSDKP Kupang - Morning Patrol',
    detected: 23,
    confidence: 96,
    timestamp: '2025-01-20 14:23',
    drone: 'Pyrhos X V1',
    location: 'Kupang Waters',
    image: vesselDetectionImg,
  },
  {
    id: 2,
    type: 'Hull Number Recognition',
    mission: 'Harbor Gate Inspection - Kupang',
    detected: 18,
    confidence: 92,
    timestamp: '2025-01-18 14:24',
    drone: 'AR-2 Aerial',
    location: 'Kupang Port',
    image: hullNumberImg,
  },
  {
    id: 3,
    type: 'Vessel Attributes',
    mission: 'Bolok Harbor Security',
    detected: 47,
    confidence: 89,
    timestamp: '2025-01-19 10:15',
    drone: 'AR-2 Aerial',
    location: 'Bolok, Kupang',
    image: vesselAttributeImg,
  },
  {
    id: 4,
    type: 'Trash Detection',
    mission: 'Tenau Coastal Monitoring',
    detected: 312,
    confidence: 87,
    timestamp: '2025-01-19 08:21',
    drone: 'Pyrhos X V1',
    location: 'Tenau Waters',
    image: vesselDetectionImg,
  },
  {
    id: 5,
    type: 'Event Detection',
    mission: 'NTT Maritime Border Security',
    detected: 'Unauthorized Entry',
    confidence: 94,
    timestamp: '2025-01-20 16:20',
    drone: 'Pyrhos X V1',
    location: 'Border Zone NTT',
    image: vesselAttributeImg,
  },
];

// Chart data

// Map configurations
const mapConfig = {
  kupang: {
    center: [-10.20073, 123.53838] as [number, number],
    zoom: 13,
    label: 'PSDKP Kupang'
  },
  indonesia: {
    center: [-2.5, 118.0] as [number, number],
    zoom: 5,
    label: 'Indonesia Overview'
  }
};

export default function Dashboard() {
  const [selectedDetection, setSelectedDetection] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('week');
  const [filterType, setFilterType] = useState('all');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mapView, setMapView] = useState<'kupang' | 'indonesia'>('kupang');
  const [showAIS, setShowAIS] = useState(true);
  const [showADSB, setShowADSB] = useState(true);
  const [showENC, setShowENC] = useState(false);
  const [showWeather, setShowWeather] = useState(false);

  const memoizedDrones = useMemo(() => liveOperations.map(op => ({
    id: op.id,
    position: [op.position[0], op.position[1]] as [number, number],
    name: op.droneName,
    status: op.status as 'active' | 'warning' | 'critical',
    color: op.color,
  })), []);

  const memoizedAnomalies = useMemo(() => aiDetections
    .filter(d => d.location)
    .map(d => ({
      id: d.id,
      position: [d.location!.lat, d.location!.lng] as [number, number],
      type: d.type
    })), []);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };


  const filteredDetections = detectionResults.filter(d => {
    if (filterType === 'all') return true;
    return d.type.toLowerCase().includes(filterType.toLowerCase());
  });

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Elongated Mission Status Bar - Pure White Edition */}
      <div className="bg-[#050a10]/80 border border-white/10 rounded-2xl px-8 py-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-10">

          {/* Left: Time & Calendar Sequence */}
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-white" />
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold tracking-[0.05em] text-white">{formatTime(currentTime)}</span>
                <span className="text-[10px] font-black text-white/60 uppercase">WIB</span>
              </div>
            </div>
            <div className="w-px h-5 bg-white/20"></div>
            <span className="text-xs font-bold text-white uppercase tracking-[0.15em]">
              {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>

          {/* Right: Environmental Intelligence Sequence */}
          <div className="flex items-center gap-12">
            <div className="flex items-center gap-4">
              <Cloud className="w-5 h-5 text-white" />
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-white leading-none">28°C</span>
                <span className="text-[10px] font-black text-white uppercase tracking-widest ml-1">Partly Cloudy</span>
              </div>
            </div>

            <div className="w-px h-6 bg-white/20"></div>

            <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Wind Speed</span>
                <span className="text-sm font-bold text-white">12.5 kn</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Wave Height</span>
                <span className="text-sm font-bold text-white">1.2m</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Section Title */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-lg md:text-xl text-[#ffffff]">Dashboard</h2>
          <p className="text-muted-foreground text-xs md:text-sm">Maritime & Fisheries Surveillance Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[120px] md:w-[150px] bg-card border-border text-xs h-9">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <SelectValue placeholder="Time Period" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 md:p-6 bg-card border-l-4 border-l-[#21A68D]">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-5 h-5" style={{ color: '#21A68D' }} />
            <p className="text-sm text-muted-foreground">Total Missions</p>
          </div>
          <p className="text-3xl md:text-4xl font-bold">{missionSummary.totalMissions}</p>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-500">+2 this week</p>
          </div>
        </Card>

        <Card className="p-5 md:p-6 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-5 h-5" style={{ color: '#D4E268' }} />
            <p className="text-sm text-muted-foreground">AI Detections</p>
          </div>
          <p className="text-3xl md:text-4xl font-bold" style={{ color: '#D4E268' }}>{missionSummary.totalDetections}</p>
          <p className="text-sm text-muted-foreground mt-2">Total found</p>
        </Card>

        <Card className="p-5 md:p-6 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5" style={{ color: '#ef4444' }} />
            <p className="text-sm text-muted-foreground">Anomalies</p>
          </div>
          <p className="text-3xl md:text-4xl font-bold" style={{ color: '#ef4444' }}>{missionSummary.totalAnomalies}</p>
          <p className="text-sm text-muted-foreground mt-2">Detected</p>
        </Card>

        <Card className="p-5 md:p-6 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Cloud className="w-5 h-5 text-blue-400" />
            <p className="text-sm text-muted-foreground">Current Weather</p>
          </div>
          <p className="text-3xl md:text-4xl font-bold text-[#f8fafc]">
            {mockWeatherData?.[0]?.temp || 28}°C
          </p>
          <div className="flex items-center gap-1 mt-2">
            <Wind className="w-4 h-4 text-blue-300" />
            <p className="text-sm text-blue-300">
              {mockWeatherData?.[0]?.value || 12} {mockWeatherData?.[0]?.unit || 'kn'} • {mockWeatherData?.[0]?.description || 'Clear'}
            </p>
          </div>
        </Card>
      </div>

      {/* Charts Row */}


      {/* Live Operations Map */}
      <div>
        <h2 className="text-lg mb-4 flex items-center gap-2 text-[#ffffff]">
          <MapPin className="w-5 h-5" style={{ color: '#0F4C75' }} />
          Live Operations Map
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map Display */}
          <Card className="lg:col-span-2 p-0 bg-card border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <h3 className="flex items-center gap-2 text-sm">
                  <Radio className="w-4 h-4 animate-pulse" style={{ color: '#22c55e' }} />
                  {mapConfig[mapView].label}
                </h3>
                <Badge variant="outline" className="animate-pulse" style={{ borderColor: '#22c55e', color: '#22c55e' }}>
                  LIVE
                </Badge>
              </div>
            </div>
            <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px]">
              <LeafletMap
                center={mapConfig[mapView].center}
                zoom={mapConfig[mapView].zoom}
                drones={memoizedDrones}
                aisMarkers={mockAISData}
                adsbMarkers={mockADSBData}
                encMarkers={mockENCData}
                anomalies={memoizedAnomalies}
                geofences={mockGeofences}
                showENC={showENC}
                showAIS={showAIS}
                showADSB={showADSB}
                showWeather={showWeather}
                weatherMarkers={mockWeatherData}
                mapView={mapView}
              />
              <MapOverlayControls
                mapView={mapView}
                onMapViewChange={setMapView}
                aisCount={mockAISData.length}
                nonAisCount={0}
                activeUavCount={liveOperations.length}
                anomaliesCount={aiDetections.filter(d => d.location).length}
                showAIS={showAIS}
                showADSB={showADSB}
                showENC={showENC}
                showWeather={showWeather}
                onToggleAIS={() => setShowAIS(!showAIS)}
                onToggleADSB={() => setShowADSB(!showADSB)}
                onToggleENC={() => setShowENC(!showENC)}
                onToggleWeather={() => setShowWeather(!showWeather)}
              />
            </div>
          </Card>

          {/* Live Data Sidebar */}
          <div className="space-y-4">
            {/* Active Operations */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm mb-3 flex items-center gap-2">
                <Radio className="w-4 h-4" style={{ color: '#22c55e' }} />
                Active Operations
              </h3>
              <div className="space-y-3">
                {liveOperations.map(op => (
                  <div key={op.id} className="p-3 rounded-lg bg-muted/30 border border-[#22c55e]/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-sm font-semibold">{op.droneName}</span>
                      </div>
                      <Badge variant="outline" style={{ borderColor: '#21A68D', color: '#21A68D' }}>
                        {op.droneType}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{op.mission}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">Battery</p>
                        <p className="text-green-500">{op.telemetry.battery}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Altitude</p>
                        <p>{op.telemetry.altitude}m</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* AIS Data Feed */}
            <Card className="p-4 bg-card border-border">
              <h3 className="text-sm mb-3 flex items-center gap-2">
                <Ship className="w-4 h-4" style={{ color: '#0F4C75' }} />
                AIS Vessels ({mockAISData.length})
              </h3>
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {mockAISData.map(vessel => (
                  <div key={vessel.id} className="p-2 rounded bg-muted/30 text-xs hover:bg-[#21A68D]/5 transition-colors border border-transparent hover:border-[#21A68D]/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{vessel.name}</span>
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: '#0F4C75', color: '#0F4C75' }}>
                        {vessel.type}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>{vessel.speed} kn</span>
                      <span>{vessel.length}m</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* AI Detection Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg flex items-center gap-2 text-[#ffffff]">
            <Eye className="w-5 h-5" style={{ color: '#21A68D' }} />
            Recent AI Detections
          </h2>
          <div className="flex gap-2">
            <Tabs value={filterType} onValueChange={setFilterType}>
              <TabsList>
                <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                <TabsTrigger value="vessel" className="text-xs">Vessel</TabsTrigger>
                <TabsTrigger value="hull" className="text-xs">Hull</TabsTrigger>
                <TabsTrigger value="trash" className="text-xs">Trash</TabsTrigger>
                <TabsTrigger value="event" className="text-xs">Event</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredDetections.map((detection) => (
            <Card
              key={detection.id}
              className="overflow-hidden bg-card border-border hover:border-[#21A68D] transition-all cursor-pointer"
              onClick={() => setSelectedDetection(detection)}
            >
              <div className="relative aspect-video bg-black">
                <ImageWithFallback
                  src={detection.image}
                  alt={detection.type}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded">
                  <Badge variant="outline" style={{ borderColor: '#21A68D', color: '#21A68D' }} className="text-xs">
                    {detection.confidence}%
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-semibold text-sm mb-1">{detection.type}</h4>
                <p className="text-xs text-muted-foreground mb-2">{detection.mission}</p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="text-muted-foreground">{detection.location}</span>
                  </div>
                  <Badge variant="outline" style={{ borderColor: '#21A68D', color: '#21A68D' }}>
                    {detection.detected}
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {detection.timestamp}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Missions */}
      <div>
        <h2 className="text-lg mb-4 flex items-center gap-2 text-[#ffffff]">
          <Target className="w-5 h-5" style={{ color: '#0F4C75' }} />
          Recent Missions
        </h2>
        <Card className="p-4 bg-card border-border">
          <div className="space-y-3">
            {missions.slice(0, 5).map((mission) => {
              const statusColor = mission.status === 'completed' ? '#22c55e' : mission.status === 'active' ? '#D4E268' : '#ef4444';
              return (
                <div
                  key={mission.id}
                  className="p-3 rounded-lg bg-muted/30 border border-border hover:border-[#21A68D] transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold">{mission.name}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {mission.droneType} • {mission.location}
                      </p>
                    </div>
                    <Badge variant="outline" style={{ borderColor: statusColor, color: statusColor }}>
                      {mission.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p>{mission.totalDuration} min</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Area</p>
                      <p>{mission.coverageArea} km²</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Flights</p>
                      <p>{mission.totalFlights}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Detections</p>
                      <p className="text-[#21A68D]">{mission.totalDetections}</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <Progress value={(mission.completedFlights / mission.totalFlights) * 100} className="h-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Detection Detail Dialog */}
      <Dialog open={!!selectedDetection} onOpenChange={() => setSelectedDetection(null)}>
        <DialogContent className="max-w-2xl">
          {selectedDetection && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedDetection.type}</DialogTitle>
                <DialogDescription>{selectedDetection.mission}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                  <ImageWithFallback
                    src={selectedDetection.image}
                    alt={selectedDetection.type}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Detected Objects</p>
                    <p className="text-xl mt-1">{selectedDetection.detected}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Confidence</p>
                    <p className="text-xl mt-1 text-green-500">{selectedDetection.confidence}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="mt-1">{selectedDetection.location}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Timestamp</p>
                    <p className="mt-1">{selectedDetection.timestamp}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Drone</p>
                    <p className="mt-1">{selectedDetection.drone}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Type</p>
                    <Badge variant="outline" style={{ borderColor: '#21A68D', color: '#21A68D' }}>
                      {selectedDetection.type}
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}