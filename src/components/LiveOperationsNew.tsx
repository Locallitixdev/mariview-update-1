import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import MissionMap from './MissionMap';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { VisuallyHidden } from './ui/visually-hidden';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import vesselDetectionImg from '../assets/vessel_detection.png';
import hullNumberImg from '../assets/hull_number.png';
import vesselAttributeImg from '../assets/vessel_attribute.png';
import MapOverlayControls from './MapOverlayControls';
import { mockAISData, mockADSBData, mockGeofences, mockENCData } from '../data/mock-data';
import {
  Battery,
  Gauge,
  Navigation,
  Radio,
  Satellite,
  Layers,
  Eye,
  EyeOff,
  Thermometer,
  Wind,
  Compass,
  MapPin,
  Clock,
  Activity,
  Zap,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Ship,
  Plane as PlaneIcon,
  Waves,
  Maximize2,
  Minimize2,
  X,
  Square,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

// Live drone data - Kupang
const initialOperations = [
  {
    id: 'OP-2024-001',
    droneName: 'Pyrhos X V1',
    droneType: 'UAV',
    pilot: 'Sarah Chen',
    status: 'active',
    mission: 'Port Surveillance',
    videoId: 'yz8nAELG0JY',
    location: { lat: -10.1735, lng: 123.5250 }, // Kupang
    telemetry: {
      altitude: 127,
      speed: 12.3,
      battery: 78,
      distance: 2.4,
      signal: 95,
      satellites: 14,
      droneHeight: 150,
      temperature: 32,
      windSpeed: 8.5,
      heading: 145,
      voltage: 24.3,
      current: 12.5,
      latitude: -10.1950,
      longitude: 123.5450,
      flightTime: '00:23:45',
      isLanding: false,
    },
    aiDetections: [
      {
        id: 'DET-001',
        type: 'Vessel Detection & Recognition',
        vesselName: 'MV OCEANIC SPIRIT',
        vesselType: 'Container Ship',
        count: 1,
        confidence: 96,
        timestamp: '14:23:45',
        captureImage: vesselDetectionImg,
        aisData: {
          mmsi: '477123456',
          imo: 'IMO9234567',
          callSign: 'VRXY2',
          speed: 8.5,
          course: 145,
          length: 294,
          width: 32,
          draft: 12.5,
          destination: 'Jakarta Port',
          eta: '2025-01-20 16:00'
        }
      },
      {
        id: 'DET-002',
        type: 'Vessel Hull Number Recognition',
        vesselName: 'HAPAG-LLOYD EXPRESS',
        hullNumber: 'HAPAG-LLOYD',
        count: 1,
        confidence: 92,
        timestamp: '14:24:12',
        captureImage: hullNumberImg,
        aisData: {
          mmsi: '477567890',
          imo: 'IMO9456789',
          callSign: 'VRHL4',
          speed: 12.8,
          course: 90,
          length: 334,
          width: 48,
          draft: 14.5,
          destination: 'Rotterdam',
          eta: '2025-02-05 18:00'
        }
      },
      {
        id: 'DET-003',
        type: 'Vessel Attribute Detection',
        attributes: ['Sailboat', 'Yacht', 'White Hull', 'Black Hull', 'Mast', 'Navigation Equipment'],
        count: 6,
        confidence: 89,
        timestamp: '14:24:38',
        captureImage: vesselAttributeImg,
      },
    ],
  },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return '#22c55e';
    case 'warning': return '#D4E268';
    case 'critical': return '#ef4444';
    default: return '#71717a';
  }
};

const getBatteryColor = (battery: number) => {
  if (battery > 50) return '#22c55e';
  if (battery > 20) return '#D4E268';
  return '#ef4444';
};

const getSignalColor = (signal: number) => {
  if (signal > 80) return '#22c55e';
  if (signal > 50) return '#D4E268';
  return '#ef4444';
};

interface LiveOperationsProps {
  onEndFlightComplete?: () => void;
}

export default function LiveOperations({ onEndFlightComplete }: LiveOperationsProps) {
  const [selectedDrone, setSelectedDrone] = useState(initialOperations[0]);
  const [liveOperations, setLiveOperations] = useState(initialOperations);
  const [showAIS, setShowAIS] = useState(true);
  const [showADSB, setShowADSB] = useState(true);
  const [showENC, setShowENC] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [mapView, setMapView] = useState<'kupang' | 'indonesia'>('kupang');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [mapKey, setMapKey] = useState(0);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);

  // End Flight Dialog States
  const [showEndFlightDialog, setShowEndFlightDialog] = useState(false);
  const [droneToEnd, setDroneToEnd] = useState<any>(null);
  const [isLandingDetected, setIsLandingDetected] = useState(false);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveOperations((prev) =>
        prev.map((drone) => ({
          ...drone,
          telemetry: {
            ...drone.telemetry,
            altitude: Math.max(50, drone.telemetry.altitude + (Math.random() - 0.5) * 5),
            speed: Math.max(5, drone.telemetry.speed + (Math.random() - 0.5) * 2),
            battery: Math.max(0, drone.telemetry.battery - Math.random() * 0.1),
            signal: Math.min(100, Math.max(60, drone.telemetry.signal + (Math.random() - 0.5) * 3)),
            distance: Math.max(0, drone.telemetry.distance + (Math.random() - 0.5) * 0.1),
          },
        }))
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Update selected drone with live data
  useEffect(() => {
    const updatedDrone = liveOperations.find((d) => d.id === selectedDrone.id);
    if (updatedDrone) {
      setSelectedDrone(updatedDrone);
    }
  }, [liveOperations]);

  // Trigger map resize when sidebar expands/collapses
  useEffect(() => {
    const timer = setTimeout(() => {
      // Force map to recalculate size by incrementing key
      setMapKey(prev => prev + 1);

      // Also trigger window resize event to force Leaflet map to resize
      window.dispatchEvent(new Event('resize'));
    }, 350); // Delay slightly longer than animation duration (300ms)

    return () => clearTimeout(timer);
  }, [isSidebarExpanded]);

  // Auto Landing Detection - Check for altitude < 2m
  useEffect(() => {
    liveOperations.forEach((drone) => {
      if (drone.telemetry.altitude < 2 && drone.status === 'active' && !isLandingDetected) {
        setIsLandingDetected(true);
        setDroneToEnd(drone);
        setShowEndFlightDialog(true);
      }
    });
  }, [liveOperations, isLandingDetected]);

  const handleManualEndFlight = () => {
    setDroneToEnd(selectedDrone);
    setIsLandingDetected(false);
    setShowEndFlightDialog(true);
  };

  const handleConfirmEndFlight = () => {
    if (droneToEnd) {
      console.log('🔴 End Flight Confirmed - Starting process...');
      console.log('Drone to end:', droneToEnd.name);

      // Remove drone from live operations
      setLiveOperations(prev => prev.filter(d => d.id !== droneToEnd.id));

      // If ended drone was selected, select another one if available
      if (selectedDrone.id === droneToEnd.id && liveOperations.length > 1) {
        const otherDrone = liveOperations.find(d => d.id !== droneToEnd.id);
        if (otherDrone) setSelectedDrone(otherDrone);
      }

      // Close dialogs and reset
      setShowEndFlightDialog(false);
      setDroneToEnd(null);
      setIsLandingDetected(false);

      console.log('✅ Dialog closed, about to call navigation callback...');
      console.log('Callback exists?', !!onEndFlightComplete);

      // Call the callback after a short delay to ensure state updates complete
      if (onEndFlightComplete) {
        console.log('🚀 Calling onEndFlightComplete in 300ms...');
        setTimeout(() => {
          console.log('📍 Navigating to Mission History NOW!');
          onEndFlightComplete();
        }, 300);
      } else {
        console.log('⚠️ WARNING: onEndFlightComplete callback not provided!');
      }
    }
  };

  const handleCancelEndFlight = () => {
    setShowEndFlightDialog(false);
    setDroneToEnd(null);
    setIsLandingDetected(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="p-2 md:p-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-sm md:text-base text-[rgb(255,255,255)] mb-0">Live Operations</h1>
            <p className="text-muted-foreground text-[10px] md:text-xs">Real-time drone monitoring</p>
          </div>
          <Badge className="bg-[#22c55e] text-white px-2 py-0.5 text-[10px]">
            <div className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse" />
            {liveOperations.filter(d => d.status === 'active').length} Active
          </Badge>
        </div>
      </div>

      {/* Fullscreen Video Modal */}
      <Dialog open={isVideoFullscreen} onOpenChange={setIsVideoFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black border-[#21A68D]">
          <VisuallyHidden>
            <DialogTitle>Live Video Stream Fullscreen</DialogTitle>
            <DialogDescription>
              Fullscreen view of live drone video feed from {selectedDrone.droneName} with real-time telemetry overlay
            </DialogDescription>
          </VisuallyHidden>

          <div className="relative w-full h-full flex flex-col">
            {/* Header with close button - Original Simple Style */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-black/60 px-3 py-1.5 rounded">
                  <div className="w-2 h-2 bg-[#ef4444] rounded-full animate-pulse" />
                  <span className="text-white text-sm font-semibold">LIVE</span>
                </div>
                <div>
                  <p className="text-white font-semibold">{selectedDrone.droneName}</p>
                  <p className="text-white/60 text-sm">{selectedDrone.mission}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="bg-black/40 hover:bg-black/60 text-white"
                onClick={() => setIsVideoFullscreen(false)}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Video Container - Zoomed to fill vertical space */}
            <div className="flex-1 flex items-center justify-center bg-black overflow-hidden relative">
              <iframe
                src={`https://www.youtube.com/embed/${selectedDrone.videoId}?autoplay=1&mute=0&loop=1&playlist=${selectedDrone.videoId}&controls=1&showinfo=0&rel=0`}
                className="absolute inset-0 w-full h-full scale-[1.3] md:scale-[1.1]"
                allow="autoplay; encrypted-media"
                allowFullScreen
                style={{ border: 'none' }}
              />
            </div>

            {/* Bottom telemetry overlay - Original 8-column Grid */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 pb-10">
              <div className="grid grid-cols-4 md:grid-cols-8 gap-4 max-w-7xl mx-auto">
                <div className="flex flex-col">
                  <span className="text-white/60 text-[10px]">ALTITUDE</span>
                  <span className="text-white font-bold">{Math.round(selectedDrone.telemetry.altitude)}m</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/60 text-[10px]">SPEED</span>
                  <span className="text-white font-bold">{selectedDrone.telemetry.speed.toFixed(1)} m/s</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/60 text-[10px]">BATTERY</span>
                  <span className="font-bold" style={{ color: getBatteryColor(selectedDrone.telemetry.battery) }}>
                    {Math.round(selectedDrone.telemetry.battery)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/60 text-[10px]">SIGNAL</span>
                  <span className="font-bold" style={{ color: getSignalColor(selectedDrone.telemetry.signal) }}>
                    {Math.round(selectedDrone.telemetry.signal)}%
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/60 text-[10px]">HEADING</span>
                  <span className="text-white font-bold">{Math.round(selectedDrone.telemetry.heading)}°</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/60 text-[10px]">SATELLITES</span>
                  <span className="text-white font-bold">{selectedDrone.telemetry.satellites}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/60 text-[10px]">FLIGHT TIME</span>
                  <span className="text-white font-bold font-mono">{selectedDrone.telemetry.flightTime}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white/60 text-[10px]">DISTANCE</span>
                  <span className="text-white font-bold">{selectedDrone.telemetry.distance.toFixed(1)} km</span>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Map */}
        <div className="flex-1 relative">
          <MissionMap
            center={[-10.1735, 123.5250]}
            zoom={14}
            drones={liveOperations.map(drone => ({
              id: drone.id,
              position: [drone.location.lat, drone.location.lng] as [number, number],
              name: drone.droneName,
              status: drone.status as 'active' | 'warning' | 'critical',
              color: getStatusColor(drone.status)
            }))}
            aisMarkers={showAIS ? mockAISData : []}
            adsbMarkers={showADSB ? mockADSBData : []}
            encMarkers={showENC ? mockENCData : []}
            geofences={mockGeofences}
            showAIS={showAIS}
            showADSB={showADSB}
            showENC={showENC}
            onDroneClick={(droneId) => {
              const drone = liveOperations.find(d => d.id === droneId);
              if (drone) setSelectedDrone(drone);
            }}
            className="w-full h-full"
          />

          {/* Layer Toggle Dropdown -> Replaced with MapOverlayControls */}
          <MapOverlayControls
            mapView={mapView}
            onMapViewChange={setMapView}
            aisCount={showAIS ? mockAISData.length : 0}
            nonAisCount={0}
            activeUavCount={liveOperations.filter(d => d.status === 'active').length}
            anomaliesCount={0}
            showAIS={showAIS}
            showADSB={showADSB}
            showENC={showENC}
            showWeather={showWeather}
            onToggleAIS={() => setShowAIS(!showAIS)}
            onToggleADSB={() => setShowADSB(!showADSB)}
            onToggleENC={() => setShowENC(!showENC)}
            onToggleWeather={() => setShowWeather(!showWeather)}
            showViewToggle={false}
            showLegend={false}
          />
        </div>

        {/* Right Sidebar: Live Stream & AI Results - Expandable */}
        <motion.div
          className="border-l border-border flex flex-col overflow-hidden bg-[#0a0e1a] relative"
          initial={false}
          animate={{ width: isSidebarExpanded ? 384 : 48 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {/* Toggle Button */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className="absolute top-2 left-2 z-10 bg-[#21A68D]/20 hover:bg-[#21A68D]/40 text-white"
          >
            {isSidebarExpanded ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </Button>

          <AnimatePresence>
            {isSidebarExpanded && (
              <motion.div
                className="flex-1 flex flex-col overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Live Stream */}
                <div className="p-3 border-b border-border flex-shrink-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="text-xs font-semibold" style={{ color: '#21A68D' }}>Live Stream</h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0"
                      onClick={() => setIsVideoFullscreen(true)}
                    >
                      <Maximize2 className="w-3.5 h-3.5" style={{ color: '#21A68D' }} />
                    </Button>
                  </div>
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-[#21A68D]">
                    <iframe
                      src={`https://www.youtube.com/embed/${selectedDrone.videoId}?autoplay=1&mute=1&loop=1&playlist=${selectedDrone.videoId}&controls=0&showinfo=0&rel=0`}
                      className="w-full h-full"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                      style={{ border: 'none' }}
                    />
                    {/* Live indicator */}
                    <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 px-2 py-1 rounded">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-white text-xs">LIVE</span>
                    </div>
                  </div>
                </div>

                {/* AI Detection Results */}
                <div className="flex-1 flex flex-col min-h-0">
                  <div className="p-3 pb-1.5 flex-shrink-0">
                    <h3 className="text-xs font-semibold" style={{ color: '#0F4C75' }}>AI Detection Results</h3>
                  </div>
                  <div className="flex-1 overflow-y-auto px-3 pb-3">
                    {selectedDrone.aiDetections.length > 0 ? (
                      <div className="space-y-3">
                        {selectedDrone.aiDetections.map((detection, idx) => (
                          <motion.div
                            key={detection.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <Card className="overflow-hidden bg-background/50 border-[#21A68D]">
                              {/* Header */}
                              <div className="p-2 bg-[#21A68D]/10 border-b border-[#21A68D]/30">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1.5">
                                    <Ship className="w-3.5 h-3.5" style={{ color: '#21A68D' }} />
                                    <span className="text-[10px] font-semibold">{detection.type}</span>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-xs"
                                    style={{ borderColor: '#22c55e', color: '#22c55e' }}
                                  >
                                    {detection.confidence}%
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="w-3 h-3" />
                                  <span>{detection.timestamp}</span>
                                </div>
                              </div>

                              {/* Capture Image */}
                              <div className="relative aspect-video bg-black">
                                <img
                                  src={detection.captureImage}
                                  alt="Detection capture"
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute top-2 right-2 bg-black/70 px-2 py-1 rounded text-xs">
                                  <span className="text-[#21A68D]">AI DETECTED</span>
                                </div>
                              </div>

                              {/* Detection Info */}
                              <div className="p-2 space-y-1.5">
                                {/* Vessel Detection & Recognition */}
                                {detection.type === 'Vessel Detection & Recognition' && detection.aisData && (
                                  <>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Vessel Name</span>
                                      <span className="font-semibold" style={{ color: '#21A68D' }}>
                                        {detection.vesselName}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-muted-foreground">Type</span>
                                      <span>{detection.vesselType}</span>
                                    </div>

                                    {/* AIS Data Comparison */}
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Radio className="w-3 h-3" style={{ color: '#0F4C75' }} />
                                        <span className="text-xs font-semibold" style={{ color: '#0F4C75' }}>
                                          AIS Data Correlation
                                        </span>
                                      </div>
                                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                        <div className="p-1 px-1.5 rounded bg-muted/30">
                                          <p className="text-white/40 text-[9px]">MMSI</p>
                                          <p className="font-mono text-white/80">{detection.aisData.mmsi}</p>
                                        </div>
                                        <div className="p-1 px-1.5 rounded bg-muted/30">
                                          <p className="text-white/40 text-[9px]">IMO</p>
                                          <p className="font-mono text-white/80">{detection.aisData.imo}</p>
                                        </div>
                                        <div className="p-1 px-1.5 rounded bg-muted/30">
                                          <p className="text-white/40 text-[9px]">Speed</p>
                                          <p className="text-white/80">{detection.aisData.speed} kn</p>
                                        </div>
                                        <div className="p-1 px-1.5 rounded bg-muted/30">
                                          <p className="text-white/40 text-[9px]">Course</p>
                                          <p className="text-white/80">{detection.aisData.course}°</p>
                                        </div>
                                        <div className="p-1 px-1.5 rounded bg-muted/30">
                                          <p className="text-white/40 text-[9px]">Length</p>
                                          <p className="text-white/80">{detection.aisData.length}m</p>
                                        </div>
                                        <div className="p-1 px-1.5 rounded bg-muted/30">
                                          <p className="text-white/40 text-[9px]">Draft</p>
                                          <p className="text-white/80">{detection.aisData.draft}m</p>
                                        </div>
                                      </div>
                                      <div className="mt-2 p-2 rounded bg-[#0F4C75]/10 border border-[#0F4C75]/30">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground">Destination</span>
                                          <span className="font-semibold">{detection.aisData.destination}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-xs mt-1">
                                          <span className="text-muted-foreground">ETA</span>
                                          <span>{detection.aisData.eta}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* Hull Number Recognition */}
                                {detection.type === 'Vessel Hull Number Recognition' && detection.aisData && (
                                  <>
                                    <div className="p-3 rounded bg-[#21A68D]/10 border border-[#21A68D]">
                                      <p className="text-xs text-muted-foreground mb-1">Recognized Hull Number</p>
                                      <p className="text-lg font-bold font-mono" style={{ color: '#21A68D' }}>
                                        {detection.hullNumber}
                                      </p>
                                    </div>

                                    {/* AIS Verification */}
                                    <div className="mt-3 pt-3 border-t border-border">
                                      <div className="flex items-center gap-2 mb-2">
                                        <Radio className="w-3 h-3" style={{ color: '#0F4C75' }} />
                                        <span className="text-xs font-semibold" style={{ color: '#0F4C75' }}>
                                          AIS Verification
                                        </span>
                                        <Badge
                                          variant="outline"
                                          className="ml-auto text-[10px]"
                                          style={{ borderColor: '#22c55e', color: '#22c55e' }}
                                        >
                                          MATCHED
                                        </Badge>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2 rounded bg-muted/30">
                                          <p className="text-muted-foreground text-[10px]">Call Sign</p>
                                          <p className="font-mono">{detection.aisData.callSign}</p>
                                        </div>
                                        <div className="p-2 rounded bg-muted/30">
                                          <p className="text-muted-foreground text-[10px]">Speed</p>
                                          <p>{detection.aisData.speed} kn</p>
                                        </div>
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* Vessel Attributes */}
                                {detection.type === 'Vessel Attribute Detection' && detection.attributes && (
                                  <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Detected Attributes:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {detection.attributes.map((attr, i) => (
                                        <Badge
                                          key={i}
                                          variant="outline"
                                          className="text-[10px]"
                                          style={{ borderColor: '#21A68D', color: '#21A68D' }}
                                        >
                                          {attr}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Confidence Bar */}
                                <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                                  <div
                                    className="h-1.5 rounded-full bg-[#22c55e]"
                                    style={{ width: `${detection.confidence}%` }}
                                  />
                                </div>
                              </div>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <Card className="p-4 bg-background/50 border-dashed">
                        <p className="text-sm text-muted-foreground text-center">
                          No AI detections available
                        </p>
                      </Card>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapsed State - Vertical Icons */}
          <AnimatePresence>
            {!isSidebarExpanded && (
              <motion.div
                className="flex-1 flex flex-col items-center justify-center gap-6 py-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[#21A68D]/20 flex items-center justify-center">
                    <Activity className="w-4 h-4" style={{ color: '#21A68D' }} />
                  </div>
                  <span className="text-[10px] text-white/60 writing-mode-vertical">LIVE</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded bg-[#0F4C75]/20 flex items-center justify-center">
                    <Eye className="w-4 h-4" style={{ color: '#0F4C75' }} />
                  </div>
                  <span className="text-[10px] text-white/60 writing-mode-vertical">AI</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* End Flight Confirmation Dialog */}
      <Dialog open={showEndFlightDialog} onOpenChange={setShowEndFlightDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isLandingDetected ? (
                <>
                  <AlertCircle className="w-5 h-5" style={{ color: '#D4E268' }} />
                  <span>Landing Detected</span>
                </>
              ) : (
                <>
                  <Square className="w-5 h-5" style={{ color: '#ef4444' }} />
                  <span>End Flight</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {isLandingDetected
                ? `${droneToEnd?.droneName} has landed (altitude: ${droneToEnd?.telemetry.altitude.toFixed(1)}m). Would you like to end this flight?`
                : `Are you sure you want to end the flight for ${droneToEnd?.droneName}? This will stop recording and save telemetry data.`}
            </DialogDescription>
          </DialogHeader>

          {droneToEnd && (
            <div className="space-y-4">
              {/* Flight Summary */}
              <Card className="p-4 bg-muted/30">
                <h4 className="text-sm mb-3" style={{ color: '#21A68D' }}>Flight Summary</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Drone</p>
                    <p>{droneToEnd.droneName}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Pilot</p>
                    <p>{droneToEnd.pilot}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Mission</p>
                    <p className="text-xs">{droneToEnd.mission}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Flight Time</p>
                    <p style={{ color: '#21A68D' }}>{droneToEnd.telemetry.flightTime}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Battery</p>
                    <p style={{ color: getBatteryColor(droneToEnd.telemetry.battery) }}>
                      {Math.round(droneToEnd.telemetry.battery)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Altitude</p>
                    <p>{Math.round(droneToEnd.telemetry.altitude)}m</p>
                  </div>
                </div>
              </Card>

              {isLandingDetected && (
                <Card className="p-3 bg-[#D4E268]/10 border border-[#D4E268]/30">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#D4E268' }} />
                    <p className="text-xs text-muted-foreground">
                      Auto-detected landing. Altitude is below 2 meters threshold.
                    </p>
                  </div>
                </Card>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelEndFlight}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  style={{ backgroundColor: '#ef4444' }}
                  onClick={handleConfirmEndFlight}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Confirm End Flight
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bottom: Enhanced Live Telemetry - Ultra Compact */}
      <div className="h-[84px] border-t-2 border-[#21A68D] bg-gradient-to-b from-[#0a0e1a] to-[#050810] flex-shrink-0">
        <div className="h-full px-3 py-1">
          {/* Top Row: Main Telemetry - Compact */}
          <div className="flex items-center justify-between mb-2">
            {/* Drone Info */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-[10px] text-white/60">ACTIVE DRONE</span>
                <span className="text-sm font-bold text-white" style={{ color: '#21A68D' }}>
                  {selectedDrone.droneName}
                </span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/60">MISSION</span>
                <span className="text-[11px] text-white">{selectedDrone.mission}</span>
              </div>
              <div className="h-6 w-px bg-border" />
              <div className="flex flex-col">
                <span className="text-[10px] text-white/60">PILOT</span>
                <span className="text-xs text-white">{selectedDrone.pilot}</span>
              </div>
            </div>

            {/* Flight Time */}
            {selectedDrone.telemetry.flightTime && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#21A68D]/10 border border-[#21A68D]">
                  <Clock className="w-3 h-3" style={{ color: '#21A68D' }} />
                  <span className="text-[10px] text-white/60">TIME</span>
                  <span className="text-white text-xs font-mono font-bold">{selectedDrone.telemetry.flightTime}</span>
                </div>
              </div>
            )}

            {/* End Flight Button */}
            {!selectedDrone.telemetry.isLanding && (
              <Button
                size="sm"
                className="h-7 px-3 text-xs"
                style={{ backgroundColor: '#ef4444' }}
                onClick={handleManualEndFlight}
              >
                <Square className="w-2.5 h-2.5 mr-1" />
                End Flight
              </Button>
            )}
          </div>

          {/* Bottom Row: Detailed Telemetry Grid - Compact */}
          <div className="grid grid-cols-12 gap-2">
            {/* Battery with Progress */}
            <motion.div
              className="col-span-2 flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Battery className="w-3 h-3" style={{ color: getBatteryColor(selectedDrone.telemetry.battery) }} />
                <span className="text-[10px] text-white/60">BATTERY</span>
              </div>
              <span className="text-base font-bold" style={{ color: getBatteryColor(selectedDrone.telemetry.battery) }}>
                {Math.round(selectedDrone.telemetry.battery)}%
              </span>
              <div className="w-full bg-muted/30 rounded-full h-1 mt-0.5">
                <motion.div
                  className="h-1 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedDrone.telemetry.battery}%` }}
                  transition={{ duration: 0.5 }}
                  style={{ backgroundColor: getBatteryColor(selectedDrone.telemetry.battery) }}
                />
              </div>
            </motion.div>

            {/* Altitude */}
            <motion.div
              className="col-span-1 flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Navigation className="w-3 h-3" style={{ color: '#21A68D' }} />
                <span className="text-[10px] text-white/60">ALT</span>
              </div>
              <span className="text-base font-bold text-white">{Math.round(selectedDrone.telemetry.altitude)}</span>
              <span className="text-[10px] text-white/60">m</span>
            </motion.div>

            {/* Speed */}
            <motion.div
              className="col-span-1 flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Gauge className="w-3 h-3" style={{ color: '#0F4C75' }} />
                <span className="text-[10px] text-white/60">SPD</span>
              </div>
              <span className="text-base font-bold text-white">{selectedDrone.telemetry.speed.toFixed(1)}</span>
              <span className="text-[10px] text-white/60">m/s</span>
            </motion.div>

            {/* Distance */}
            <motion.div
              className="col-span-1 flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="w-3 h-3" style={{ color: '#8b5cf6' }} />
                <span className="text-[10px] text-white/60">DIST</span>
              </div>
              <span className="text-sm font-bold text-white">{selectedDrone.telemetry.distance.toFixed(1)}</span>
              <span className="text-[10px] text-white/60">km</span>
            </motion.div>

            {/* Signal with Progress */}
            <motion.div
              className="col-span-1 flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Radio className="w-3 h-3" style={{ color: getSignalColor(selectedDrone.telemetry.signal) }} />
                <span className="text-[10px] text-white/60">SIG</span>
              </div>
              <span className="text-sm font-bold" style={{ color: getSignalColor(selectedDrone.telemetry.signal) }}>
                {Math.round(selectedDrone.telemetry.signal)}%
              </span>
              <div className="w-full bg-muted/30 rounded-full h-1 mt-0.5">
                <motion.div
                  className="h-1 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${selectedDrone.telemetry.signal}%` }}
                  transition={{ duration: 0.5 }}
                  style={{ backgroundColor: getSignalColor(selectedDrone.telemetry.signal) }}
                />
              </div>
            </motion.div>

            {/* Satellites */}
            <motion.div
              className="col-span-1 flex flex-col"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <Satellite className="w-3 h-3" style={{ color: '#22c55e' }} />
                <span className="text-[10px] text-white/60">GPS</span>
              </div>
              <span className="text-sm font-bold text-white">{selectedDrone.telemetry.satellites}</span>
              <span className="text-[10px] text-white/60">sats</span>
            </motion.div>

            {/* Wind Speed */}
            {selectedDrone.telemetry.windSpeed && (
              <motion.div
                className="col-span-1 flex flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <Wind className="w-3 h-3" style={{ color: '#3b82f6' }} />
                  <span className="text-[10px] text-white/60">WND</span>
                </div>
                <span className="text-sm font-bold text-white">{selectedDrone.telemetry.windSpeed}</span>
                <span className="text-[10px] text-white/60">m/s</span>
              </motion.div>
            )}

            {/* Heading */}
            {selectedDrone.telemetry.heading && (
              <motion.div
                className="col-span-1 flex flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <Compass className="w-3 h-3" style={{ color: '#D4E268' }} />
                  <span className="text-[10px] text-white/60">HDG</span>
                </div>
                <span className="text-sm font-bold text-white">{Math.round(selectedDrone.telemetry.heading)}</span>
                <span className="text-[10px] text-white/60">deg</span>
              </motion.div>
            )}

            {/* Power/Voltage */}
            {selectedDrone.telemetry.voltage && (
              <motion.div
                className="col-span-1 flex flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <Zap className="w-3 h-3" style={{ color: '#f59e0b' }} />
                  <span className="text-[10px] text-white/60">VOLT</span>
                </div>
                <span className="text-sm font-bold text-white">{selectedDrone.telemetry.voltage}</span>
                <span className="text-[10px] text-white/60">V</span>
              </motion.div>
            )}

            {/* Coordinates */}
            {selectedDrone.telemetry.latitude && selectedDrone.telemetry.longitude && (
              <motion.div
                className="col-span-2 flex flex-col"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <MapPin className="w-3 h-3" style={{ color: '#21A68D' }} />
                  <span className="text-[10px] text-white/60">COORDS</span>
                </div>
                <span className="text-xs font-mono text-white">
                  {selectedDrone.telemetry.latitude.toFixed(4)}, {selectedDrone.telemetry.longitude.toFixed(4)}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}