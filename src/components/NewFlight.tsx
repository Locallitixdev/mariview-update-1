import { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Plus, Edit, Trash2, CheckCircle, Users, Plane, ListChecks, ArrowLeft, AlertCircle, ChevronRight, MapPin, Square, Pentagon, Eraser, Radio, Brain, Ship, Anchor, BarChart3, Activity, History as LuHistory } from 'lucide-react';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import LeafletDrawMap from './LeafletDrawMap';
import LeafletMiniMap from './LeafletMiniMap';
import LiveOperations from './LiveOperationsNew';
import MapOverlayControls from './MapOverlayControls';
import { saveToStorage, loadFromStorage } from '../utils/storage';
import { mockAISData, mockADSBData } from './shared-data';


interface Mission {
  id: string;
  name: string;
  area: string;
  category: string;
  duration: string;
  description: string;
  status: 'pending' | 'accepted' | 'completed' | 'live';
  createdAt: string;
  assignedTeam: string[];
  assignedDevice: string;
  coordinates?: { lat: number; lng: number }[];
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  status: 'available' | 'assigned' | 'busy';
}

interface Device {
  id: string;
  name: string;
  type: 'UAV' | 'AUV';
  battery: number;
  status: 'available' | 'assigned' | 'maintenance';
}

interface Point {
  x: number;
  y: number;
}

const mockTeamMembers: TeamMember[] = [
  { id: '1', name: 'John Anderson', role: 'Pilot', status: 'available' },
  { id: '2', name: 'Sarah Williams', role: 'Camera Operator', status: 'available' },
  { id: '3', name: 'Mike Chen', role: 'Navigator', status: 'assigned' },
  { id: '4', name: 'Emily Davis', role: 'Pilot', status: 'available' },
  { id: '5', name: 'David Brown', role: 'Technical Specialist', status: 'busy' },
];

const mockDevices: Device[] = [
  { id: '1', name: 'Pyrhos X V1', type: 'UAV', battery: 100, status: 'available' },
  { id: '2', name: 'AR-2 Aerial', type: 'UAV', battery: 85, status: 'available' },
  { id: '3', name: 'AquaScan Alpha', type: 'AUV', battery: 92, status: 'available' },
  { id: '4', name: 'DeepSeeker Pro', type: 'AUV', battery: 78, status: 'available' },
];

const physicalChecks = [
  { id: 'propellers', label: 'Propeller Condition', critical: true },
  { id: 'camera', label: 'Camera Lens Cleanliness', critical: true },
  { id: 'battery', label: 'Battery Connections', critical: true },
  { id: 'gimbal', label: 'Gimbal Movement', critical: true },
  { id: 'sensors', label: 'Sensor Calibration', critical: false },
  { id: 'body', label: 'Body Integrity Check', critical: false },
  { id: 'gps', label: 'GPS Module Status', critical: true },
  { id: 'motors', label: 'Motor Temperatures', critical: false },
];

const uavChecks = [
  { id: 'propellers', label: 'Propeller Condition', critical: true },
  { id: 'camera', label: 'Camera Lens Cleanliness', critical: true },
  { id: 'battery', label: 'Battery Connections', critical: true },
  { id: 'gimbal', label: 'Gimbal Movement', critical: true },
  { id: 'sensors', label: 'Sensor Calibration', critical: false },
  { id: 'body', label: 'Body Integrity Check', critical: false },
  { id: 'gps', label: 'GPS Module Status', critical: true },
  { id: 'motors', label: 'Motor Temperatures', critical: false },
];

const auvChecks = [
  { id: 'hull', label: 'Hull Integrity Check', critical: true },
  { id: 'sonar', label: 'Sonar System Test', critical: true },
  { id: 'battery', label: 'Battery Connections', critical: true },
  { id: 'thrusters', label: 'Thruster Functionality', critical: true },
  { id: 'depth', label: 'Depth Sensor Calibration', critical: false },
  { id: 'seals', label: 'Waterproof Seals Inspection', critical: true },
  { id: 'navigation', label: 'Navigation System Check', critical: true },
  { id: 'communication', label: 'Communication System Test', critical: false },
];

interface NewFlightProps {
  onMissionLaunch?: () => void;
}

export default function NewFlight({ onMissionLaunch }: NewFlightProps) {
  const [view, setView] = useState<'mission-list' | 'create-mission' | 'accept-mission' | 'pre-check' | 'ai-model-selection' | 'pre-check-summary' | 'live-mission-summary' | 'live-mission-detail' | 'post-analysis' | 'event-detection'>('mission-list');
  const [createStep, setCreateStep] = useState(1);

  // AI Model Selection State (single selection)
  const [selectedAIModel, setSelectedAIModel] = useState<string>('');

  // Initialize missions from localStorage
  const initialMissions: Mission[] = [
    {
      id: 'live-mission-1',
      name: 'Port Surveillance - Morning Patrol',
      area: 'Tanjung Priok Port Zone',
      category: 'Port Surveillance',
      duration: '1',
      description: 'Active surveillance mission monitoring port activities and vessel movements',
      status: 'live',
      createdAt: '2026-01-23T08:00:00',
      assignedTeam: ['1', '2'],
      assignedDevice: '1'
    },
    {
      id: '1',
      name: 'Downtown Infrastructure Scan',
      area: 'Sector 5, Grid A-12',
      category: 'Infrastructure Assessment',
      duration: '2',
      description: 'Comprehensive infrastructure assessment of downtown area',
      status: 'pending',
      createdAt: '2026-01-20T08:30:00',
      assignedTeam: ['1', '2'],
      assignedDevice: '1'
    },
    {
      id: '2',
      name: 'Coastal Surveillance',
      area: 'Beach Zone B',
      category: 'Environmental Monitoring',
      duration: '3',
      description: 'Monitor coastal activities and environmental conditions',
      status: 'pending',
      createdAt: '2026-01-20T09:15:00',
      assignedTeam: ['4'],
      assignedDevice: '3'
    },
  ];

  const [missions, setMissions] = useState<Mission[]>(() => {
    return loadFromStorage<Mission[]>('mariview_new_flight_missions', initialMissions);
  });

  // Auto-save missions to localStorage whenever it changes
  useEffect(() => {
    saveToStorage('mariview_new_flight_missions', missions);
  }, [missions]);

  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [missionForm, setMissionForm] = useState({
    name: '',
    area: '',
    category: '',
    duration: '',
    description: '',
  });

  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [assignedTeam, setAssignedTeam] = useState<string[]>([]);
  const [assignedDevice, setAssignedDevice] = useState<string>('');
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [missionCoordinates, setMissionCoordinates] = useState<{ lat: number; lng: number }[]>([]);
  const [showAIS, setShowAIS] = useState(true);
  const [showADSB, setShowADSB] = useState(true);
  const [showENC, setShowENC] = useState(false);
  const [showWeather, setShowWeather] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');

  const allCriticalChecked = physicalChecks
    .filter(check => check.critical)
    .every(check => checks[check.id]);

  // Get device type for pre-check
  const getDeviceType = (): 'UAV' | 'AUV' | null => {
    if (!selectedMission) return null;
    const device = mockDevices.find(d => d.id === selectedMission.assignedDevice);
    return device?.type || null;
  };

  // Get appropriate checks based on device type
  const getPreCheckList = () => {
    const deviceType = getDeviceType();
    if (deviceType === 'UAV') return uavChecks;
    if (deviceType === 'AUV') return auvChecks;
    return physicalChecks; // fallback
  };

  const currentCheckList = getPreCheckList();
  const allCurrentCriticalChecked = currentCheckList
    .filter(check => check.critical)
    .every(check => checks[check.id]);

  // Canvas Drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawingMode, setDrawingMode] = useState<'polygon' | 'rectangle' | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [drawnShapes, setDrawnShapes] = useState<Point[][]>([]);

  useEffect(() => {
    if (view === 'create-mission' && createStep === 1 && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw grid background
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let i = 0; i < canvas.height; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
      }

      // Draw all saved shapes
      drawnShapes.forEach(shape => {
        if (shape.length > 0) {
          ctx.fillStyle = 'rgba(33, 166, 141, 0.2)';
          ctx.strokeStyle = '#21A68D';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(shape[0].x, shape[0].y);
          shape.forEach(point => ctx.lineTo(point.x, point.y));
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });

      // Draw current polygon
      if (drawingMode === 'polygon' && points.length > 0) {
        ctx.strokeStyle = '#21A68D';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw points
        points.forEach(point => {
          ctx.fillStyle = '#21A68D';
          ctx.beginPath();
          ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }
  }, [view, createStep, points, drawnShapes, drawingMode]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawingMode !== 'polygon') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPoints([...points, { x, y }]);
  };

  const startPolygonDrawing = () => {
    setDrawingMode('polygon');
    setPoints([]);
  };

  const finishPolygonDrawing = () => {
    if (points.length >= 3) {
      setDrawnShapes([...drawnShapes, points]);
      const coords = `Area: ${points.length} points defined`;
      setMissionForm(prev => ({ ...prev, area: coords }));
    }
    setDrawingMode(null);
    setPoints([]);
  };

  const drawRectangle = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const width = 200;
    const height = 150;

    const rectanglePoints: Point[] = [
      { x: centerX - width / 2, y: centerY - height / 2 },
      { x: centerX + width / 2, y: centerY - height / 2 },
      { x: centerX + width / 2, y: centerY + height / 2 },
      { x: centerX - width / 2, y: centerY + height / 2 },
    ];

    setDrawnShapes([...drawnShapes, rectanglePoints]);
    setMissionForm(prev => ({ ...prev, area: 'Rectangle Area Defined' }));
  };

  const clearDrawing = () => {
    setDrawnShapes([]);
    setPoints([]);
    setDrawingMode(null);
    setMissionForm(prev => ({ ...prev, area: '' }));
  };

  // CRUD Mission Functions
  const handleCreateMission = () => {
    const newMission: Mission = {
      id: Date.now().toString(),
      name: missionForm.name,
      area: missionForm.area,
      category: missionForm.category,
      duration: missionForm.duration,
      description: missionForm.description,
      status: 'pending',
      createdAt: new Date().toISOString(),
      assignedTeam: assignedTeam,
      assignedDevice: assignedDevice,
      coordinates: missionCoordinates.length > 0 ? missionCoordinates : undefined
    };
    setMissions([...missions, newMission]);
    resetForm();
    setView('mission-list');
  };

  const handleUpdateMission = () => {
    if (editingMission) {
      setMissions(missions.map(m =>
        m.id === editingMission.id
          ? { ...m, ...missionForm, assignedTeam, assignedDevice, coordinates: missionCoordinates.length > 0 ? missionCoordinates : m.coordinates }
          : m
      ));
      resetForm();
      setEditingMission(null);
      setView('mission-list');
    }
  };

  const handleDeleteMission = (id: string) => {
    setMissions(missions.filter(m => m.id !== id));
  };

  const resetForm = () => {
    setMissionForm({
      name: '',
      area: '',
      category: '',
      duration: '',
      description: '',
    });
    setAssignedTeam([]);
    setAssignedDevice('');
    setCreateStep(1);
    setDrawnShapes([]);
    setPoints([]);
    setDrawingMode(null);
    setIsNewCategory(false);
    setCustomCategory('');
  };

  const handleEditClick = (mission: Mission) => {
    setEditingMission(mission);
    setMissionForm({
      name: mission.name,
      area: mission.area,
      category: mission.category,
      duration: mission.duration,
      description: mission.description,
    });
    setAssignedTeam(mission.assignedTeam);
    setAssignedDevice(mission.assignedDevice);
    setCreateStep(1);
    setView('create-mission');
  };

  const handleAcceptMission = (mission: Mission) => {
    setSelectedMission(mission);
    setAssignedTeam(mission.assignedTeam);
    setView('accept-mission');
  };

  const handleViewLiveMission = (mission: Mission) => {
    setSelectedMission(mission);
    setAssignedTeam(mission.assignedTeam);
    setView('live-mission-summary');
  };

  const handleProceedToPreCheck = () => {
    setView('pre-check');
  };

  const handleLaunchMission = () => {
    if (selectedMission) {
      setMissions(missions.map(m =>
        m.id === selectedMission.id
          ? { ...m, status: 'live' as const, assignedTeam }
          : m
      ));
      // Update selected mission to reflect new status
      setSelectedMission({ ...selectedMission, status: 'live' as const });
      // Go to live mission summary after launch
      setView('live-mission-summary');
    }
    if (onMissionLaunch) {
      onMissionLaunch();
    }
  };

  const canProceedStep1 = missionForm.name && missionForm.area;
  const canProceedStep2 = assignedTeam.length > 0;
  const canProceedStep3 = assignedDevice !== '';

  return (
    <div className={`p-4 md:p-6 w-full ${['live-mission-detail', 'post-analysis'].includes(view) ? '!p-0' : ''}`}>
      {/* Header */}
      {!['live-mission-detail', 'post-analysis'].includes(view) && (
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl text-[rgb(255,255,255)]">
            {['mission-list', 'event-detection'].includes(view) && 'Mission Management'}
            {view === 'create-mission' && (editingMission ? 'Edit Mission' : 'Create New Mission')}
            {view === 'accept-mission' && 'Mission Details'}
            {view === 'pre-check' && 'Pre-Flight Check'}
            {view === 'ai-model-selection' && 'AI Model Selection'}
            {view === 'pre-check-summary' && 'Pre-Flight Check Summary'}
            {view === 'live-mission-summary' && 'Live Mission Summary'}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            {['mission-list', 'event-detection'].includes(view) && 'Manage and deploy drone missions'}
            {view === 'create-mission' && createStep === 1 && 'Configure mission parameters'}
            {view === 'create-mission' && createStep === 2 && 'Select team members for mission'}
            {view === 'create-mission' && createStep === 3 && 'Choose drone for deployment'}
            {view === 'accept-mission' && 'Review and accept mission assignment'}
            {view === 'pre-check' && 'Complete pre-flight inspection checklist'}
            {view === 'ai-model-selection' && 'Select AI detection models for this mission'}
            {view === 'pre-check-summary' && 'Review inspection results before launch'}
            {view === 'live-mission-summary' && 'Review mission status and progress'}
          </p>
        </div>
      )}

      {/* Mission Section Navigation */}
      {!['live-mission-detail', 'post-analysis'].includes(view) && (
        <div className="flex items-center gap-3 mb-6">
          <Button
            onClick={() => {
              resetForm();
              setEditingMission(null);
              setView('create-mission');
            }}
            className="bg-[#21A68D] hover:bg-[#1a8a72] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Mission
          </Button>
          <Button
            variant={view === 'mission-list' ? 'default' : 'outline'}
            className={`transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${view === 'mission-list'
              ? 'bg-[#0F4C75] hover:bg-[#0d3d5e] text-white border-[#0F4C75]'
              : 'border-[#0F4C75] text-[#0F4C75] hover:bg-[#0F4C75]/10'
              }`}
            onClick={() => setView('mission-list')}
          >
            <LuHistory className="w-4 h-4 mr-2" />
            Mission List
          </Button>
          <Button
            variant={view === 'event-detection' ? 'default' : 'outline'}
            className={`transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${view === 'event-detection'
              ? 'bg-[#0F4C75] hover:bg-[#0d3d5e] text-white border-[#0F4C75]'
              : 'border-[#0F4C75] text-[#0F4C75] hover:bg-[#0F4C75]/10'
              }`}
            onClick={() => setView('event-detection')}
          >
            <Activity className="w-4 h-4 mr-2" />
            Event Detection
          </Button>
          <Button
            variant={view === 'post-analysis' ? 'default' : 'outline'}
            className={`transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md ${view === 'post-analysis'
              ? 'bg-[#0F4C75] hover:bg-[#0d3d5e] text-white border-[#0F4C75]'
              : 'border-[#0F4C75] text-[#0F4C75] hover:bg-[#0F4C75]/10'
              }`}
            onClick={() => setView('post-analysis')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Post Analysis
          </Button>
        </div>
      )}

      {view === 'mission-list' && (
        <div className="space-y-6">

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {missions.map((mission) => (
              <Card key={mission.id} className="p-5 bg-card border-border hover:border-[#21A68D] transition-all">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg">{mission.name}</h3>
                      {mission.status === 'live' && (
                        <div className="flex items-center gap-1 bg-[#22c55e]/20 border border-[#22c55e] px-2 py-0.5 rounded">
                          <div className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
                          <span className="text-xs font-bold text-[#22c55e]">LIVE</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{mission.area}</p>
                  </div>
                  {/* Only show status badge if not live */}
                  {mission.status !== 'live' && (
                    <Badge
                      variant="outline"
                      className={
                        mission.status === 'pending' ? 'border-[#D4E268] text-[#D4E268]' :
                          mission.status === 'accepted' ? 'border-[#0F4C75] text-[#0F4C75]' :
                            'border-[#21A68D] text-[#21A68D]'
                      }
                    >
                      {mission.status}
                    </Badge>
                  )}
                </div>

                {/* Mini Map Preview */}
                {mission.coordinates && mission.coordinates.length > 0 && (
                  <div className="mb-4 rounded-lg overflow-hidden border border-border">
                    <LeafletMiniMap coordinates={mission.coordinates} />
                  </div>
                )}

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span>{mission.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{mission.duration} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team:</span>
                    <span>{mission.assignedTeam.length} members</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Drone:</span>
                    <span>{mockDevices.find(d => d.id === mission.assignedDevice)?.name || 'Not assigned'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(mission.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {mission.status !== 'live' && (
                    <Button
                      size="sm"
                      onClick={() => handleAcceptMission(mission)}
                      className="flex-1 bg-[#21A68D] hover:bg-[#1a8a72] text-white"
                    >
                      Accept Mission
                    </Button>
                  )}
                  {mission.status === 'live' && (
                    <Button
                      size="sm"
                      onClick={() => handleViewLiveMission(mission)}
                      className="flex-1 bg-[#22c55e]/20 text-[#22c55e] hover:bg-[#22c55e]/30"
                    >
                      Mission In Progress
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditClick(mission)}
                    disabled={mission.status === 'live'}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteMission(mission.id)}
                    disabled={mission.status === 'live'}
                    className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )
      }

      {/* Create/Edit Mission View */}
      {
        view === 'create-mission' && (
          <div className="space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-between w-full max-w-4xl">
              {[
                { num: 1, label: 'Mission Info' },
                { num: 2, label: 'Assign Team' },
                { num: 3, label: 'Assign Device' },
              ].map((s, idx) => (
                <div key={s.num} className="flex items-center flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${createStep > s.num
                        ? 'bg-[#21A68D] border-[#21A68D] text-white'
                        : createStep === s.num
                          ? 'border-[#21A68D] text-[#21A68D]'
                          : 'border-muted text-muted-foreground'
                        }`}
                    >
                      {createStep > s.num ? <CheckCircle className="w-5 h-5" /> : s.num}
                    </div>
                    <div className="hidden sm:block">
                      <p className={`text-sm ${createStep >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {s.label}
                      </p>
                    </div>
                  </div>
                  {idx < 2 && (
                    <div className={`flex-1 h-0.5 mx-4 ${createStep > s.num ? 'bg-[#21A68D]' : 'bg-muted'}`}></div>
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Mission Info */}
            {createStep === 1 && (
              <Card className="p-6 bg-card border-border">
                <div className="space-y-6">
                  <div>
                    <h2>Mission Parameters</h2>
                    <p className="text-sm text-muted-foreground">Define the basic mission configuration</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="mission-name">Mission Name *</Label>
                      <Input
                        id="mission-name"
                        placeholder="e.g., Downtown Infrastructure Scan"
                        value={missionForm.name}
                        onChange={(e) => setMissionForm({ ...missionForm, name: e.target.value })}
                        className="bg-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="duration">Mission Duration (days)</Label>
                      <Input
                        id="duration"
                        type="number"
                        placeholder="e.g., 3"
                        value={missionForm.duration}
                        onChange={(e) => setMissionForm({ ...missionForm, duration: e.target.value })}
                        className="bg-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Mission Category</Label>
                      <Select
                        value={isNewCategory ? 'New Category' : missionForm.category}
                        onValueChange={(value: string) => {
                          if (value === 'New Category') {
                            setIsNewCategory(true);
                            setMissionForm({ ...missionForm, category: '' });
                          } else {
                            setIsNewCategory(false);
                            setCustomCategory('');
                            setMissionForm({ ...missionForm, category: value });
                          }
                        }}
                      >
                        <SelectTrigger id="category" className="bg-input">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000]">
                          <SelectItem value="Infrastructure Assessment">Infrastructure Assessment</SelectItem>
                          <SelectItem value="Environmental Monitoring">Environmental Monitoring</SelectItem>
                          <SelectItem value="Search and Rescue">Search and Rescue</SelectItem>
                          <SelectItem value="Agriculture Survey">Agriculture Survey</SelectItem>
                          <SelectItem value="Security Patrol">Security Patrol</SelectItem>
                          <SelectItem value="Mapping and Survey">Mapping and Survey</SelectItem>
                          <SelectItem value="Emergency Response">Emergency Response</SelectItem>
                          <SelectItem value="New Category">+ New Category</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Custom Category Input - Positioned in grid */}
                    {isNewCategory ? (
                      <div className="space-y-2">
                        <Label htmlFor="custom-category">Enter New Category Name *</Label>
                        <Input
                          id="custom-category"
                          placeholder="e.g., Disaster Relief"
                          value={customCategory}
                          onChange={(e) => {
                            setCustomCategory(e.target.value);
                            setMissionForm({ ...missionForm, category: e.target.value });
                          }}
                          className="bg-input"
                        />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Empty placeholder to maintain grid layout */}
                      </div>
                    )}
                  </div>

                  {/* Leaflet Map for Drawing Area */}
                  <div className="space-y-2">
                    <Label>
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Draw Mission Area on Map
                    </Label>

                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={drawingMode === 'polygon' ? 'default' : 'outline'}
                        onClick={() => {
                          if (drawingMode === 'polygon') {
                            (window as any).leafletDrawMap?.finishPolygon();
                            setDrawingMode(null);
                          } else {
                            (window as any).leafletDrawMap?.startPolygon();
                            setDrawingMode('polygon');
                          }
                        }}
                        className={drawingMode === 'polygon' ? 'bg-[#21A68D] hover:bg-[#1a8a72]' : ''}
                      >
                        <Pentagon className="w-4 h-4 mr-2" />
                        {drawingMode === 'polygon' ? 'Finish Polygon' : 'Draw Polygon'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => (window as any).leafletDrawMap?.drawRectangle()}
                        disabled={drawingMode === 'polygon'}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Draw Rectangle
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          (window as any).leafletDrawMap?.clear();
                          setMissionForm(prev => ({ ...prev, area: '' }));
                        }}
                        className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                      >
                        <Eraser className="w-4 h-4 mr-2" />
                        Clear
                      </Button>
                    </div>

                    <div className="relative">
                      <LeafletDrawMap
                        center={[-10.20073, 123.53838]}
                        zoom={13}
                        className="rounded-lg border-2 border-border overflow-hidden"
                        onAreaDrawn={(coordinates, description) => {
                          setMissionForm(prev => ({ ...prev, area: description }));
                          setMissionCoordinates(coordinates);
                        }}
                        aisMarkers={mockAISData || []}
                        adsbMarkers={mockADSBData || []}
                        showAIS={showAIS}
                        showADSB={showADSB}
                        showENC={showENC}
                        height="600px"
                      />
                      <MapOverlayControls
                        mapView="kupang"
                        onMapViewChange={() => { }}
                        aisCount={(mockAISData || []).length}
                        nonAisCount={0}
                        activeUavCount={0}
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
                        showLayers={false}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {drawingMode === 'polygon'
                        ? 'Click on the map to add points. Click "Finish Polygon" when done (minimum 3 points).'
                        : 'Use the drawing tools above to define your mission area on the map.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mission Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the mission objectives and any special requirements..."
                      value={missionForm.description}
                      onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                      className="bg-input min-h-24"
                    />
                  </div>

                  {!canProceedStep1 && (
                    <div className="p-3 rounded-lg border" style={{ borderColor: '#D4E268', backgroundColor: 'rgba(212, 226, 104, 0.1)' }}>
                      <p className="text-sm" style={{ color: '#D4E268' }}>
                        ⚠ Please fill in Mission Name and draw an area on the canvas to continue
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetForm();
                        setView('mission-list');
                      }}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setCreateStep(2)}
                      disabled={!canProceedStep1}
                      className="bg-[#21A68D] hover:bg-[#1a8a72] text-white"
                    >
                      Next: Assign Team
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 2: Assign Team */}
            {createStep === 2 && (
              <Card className="p-6 bg-card border-border">
                <div className="space-y-6">
                  <div>
                    <h2>Assign Team Members</h2>
                    <p className="text-sm text-muted-foreground">Select team members for this mission</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {mockTeamMembers.map((member) => {
                      const isAssigned = assignedTeam.includes(member.id);
                      return (
                        <Card
                          key={member.id}
                          className={`p-4 cursor-pointer transition-all ${isAssigned ? 'border-[#21A68D] border-2' : 'border-border'
                            } ${member.status === 'busy' ? 'opacity-50' : ''}`}
                          onClick={() => {
                            if (member.status !== 'busy') {
                              setAssignedTeam(
                                isAssigned
                                  ? assignedTeam.filter(id => id !== member.id)
                                  : [...assignedTeam, member.id]
                              );
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-[#21A68D] flex items-center justify-center text-white">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.role}</p>
                            </div>
                            {isAssigned && <CheckCircle className="w-5 h-5 text-[#21A68D]" />}
                          </div>
                          <Badge
                            variant="outline"
                            className={`mt-3 ${member.status === 'available' ? 'border-green-500 text-green-500' :
                              member.status === 'assigned' ? 'border-[#0F4C75] text-[#0F4C75]' :
                                'border-red-500 text-red-500'
                              }`}
                          >
                            {member.status}
                          </Badge>
                        </Card>
                      );
                    })}
                  </div>

                  {!canProceedStep2 && (
                    <div className="p-3 rounded-lg border" style={{ borderColor: '#D4E268', backgroundColor: 'rgba(212, 226, 104, 0.1)' }}>
                      <p className="text-sm" style={{ color: '#D4E268' }}>
                        ⚠ Please select at least one team member to continue
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setCreateStep(1)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      disabled={!canProceedStep2}
                      className="bg-[#21A68D] hover:bg-[#1a8a72] text-white"
                      onClick={() => setCreateStep(3)}
                    >
                      Next: Assign Device
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Step 3: Assign Device */}
            {createStep === 3 && (
              <Card className="p-6 bg-card border-border">
                <div className="space-y-6">
                  <div>
                    <h2>Assign Drone</h2>
                    <p className="text-sm text-muted-foreground">Select a drone for this mission</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {mockDevices.map((device) => {
                      const isSelected = assignedDevice === device.id;
                      const isDisabled = device.status === 'maintenance' || device.battery < 20;
                      return (
                        <Card
                          key={device.id}
                          className={`p-4 cursor-pointer transition-all ${isSelected ? 'border-[#21A68D] border-2' : 'border-border'
                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            if (!isDisabled) {
                              setAssignedDevice(device.id);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-medium mb-1">{device.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {device.type}
                              </Badge>
                            </div>
                            {isSelected && <CheckCircle className="w-5 h-5 text-[#21A68D]" />}
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Battery:</span>
                              <span className={device.battery < 30 ? 'text-red-500' : 'text-green-500'}>
                                {device.battery}%
                              </span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${device.battery < 30 ? 'bg-red-500' :
                                  device.battery < 60 ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                style={{ width: `${device.battery}%` }}
                              />
                            </div>
                            <Badge
                              variant="outline"
                              className={`${device.status === 'available' ? 'border-green-500 text-green-500' :
                                device.status === 'assigned' ? 'border-[#0F4C75] text-[#0F4C75]' :
                                  'border-red-500 text-red-500'
                                }`}
                            >
                              {device.status}
                            </Badge>
                          </div>
                        </Card>
                      );
                    })}
                  </div>

                  {!canProceedStep3 && (
                    <div className="p-3 rounded-lg border" style={{ borderColor: '#D4E268', backgroundColor: 'rgba(212, 226, 104, 0.1)' }}>
                      <p className="text-sm" style={{ color: '#D4E268' }}>
                        ⚠ Please select a drone to continue
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setCreateStep(2)}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      disabled={!canProceedStep3}
                      className="bg-[#21A68D] hover:bg-[#1a8a72] text-white"
                      onClick={editingMission ? handleUpdateMission : handleCreateMission}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {editingMission ? 'Update Mission' : 'Create Mission'}
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )
      }

      {/* Accept Mission View */}
      {
        view === 'accept-mission' && selectedMission && (
          <Card className="p-6 bg-card border-border">
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-[#21A68D]/10 border border-[#21A68D]">
                <h2 className="text-xl mb-2">{selectedMission.name}</h2>
                <p className="text-muted-foreground">{selectedMission.description}</p>
              </div>

              {/* Mission Area Map Preview */}
              {selectedMission.coordinates && selectedMission.coordinates.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm" style={{ color: '#21A68D' }}>Mission Area</h3>
                  <div className="rounded-lg overflow-hidden border border-border">
                    <LeafletMiniMap coordinates={selectedMission.coordinates} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h3 className="text-sm" style={{ color: '#21A68D' }}>Mission Parameters</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Area:</span>
                      <span>{selectedMission.area}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Category:</span>
                      <span>{selectedMission.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{selectedMission.duration} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Drone:</span>
                      <span>{mockDevices.find(d => d.id === selectedMission.assignedDevice)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(selectedMission.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm" style={{ color: '#0F4C75' }}>Assignment Status</h3>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-muted/30 flex items-center justify-between">
                      <span className="text-sm">Team Members</span>
                      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Users className="w-4 h-4 mr-1" />
                            Edit Team
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border">
                          <DialogHeader>
                            <DialogTitle>Edit Team Assignment</DialogTitle>
                            <DialogDescription>
                              Select team members for this mission
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 max-h-[400px] overflow-y-auto">
                            {mockTeamMembers.map((member) => {
                              const isAssigned = assignedTeam.includes(member.id);
                              return (
                                <Card
                                  key={member.id}
                                  className={`p-3 cursor-pointer ${isAssigned ? 'border-[#21A68D]' : ''
                                    }`}
                                  onClick={() => {
                                    if (member.status !== 'busy') {
                                      setAssignedTeam(
                                        isAssigned
                                          ? assignedTeam.filter(id => id !== member.id)
                                          : [...assignedTeam, member.id]
                                      );
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#21A68D] flex items-center justify-center text-white text-xs">
                                      {member.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium">{member.name}</p>
                                      <p className="text-xs text-muted-foreground">{member.role}</p>
                                    </div>
                                    {isAssigned && <CheckCircle className="w-4 h-4 text-[#21A68D]" />}
                                  </div>
                                </Card>
                              );
                            })}
                          </div>
                          <Button
                            onClick={() => setIsDialogOpen(false)}
                            className="bg-[#21A68D] hover:bg-[#1a8a72] text-white"
                          >
                            Confirm
                          </Button>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30">
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground block mb-2">
                          {assignedTeam.length} members assigned:
                        </span>
                        {assignedTeam.map(teamId => {
                          const member = mockTeamMembers.find(m => m.id === teamId);
                          return member ? (
                            <div key={teamId} className="text-sm flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[#21A68D] flex items-center justify-center text-white text-xs">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span>{member.name}</span>
                              <span className="text-muted-foreground">({member.role})</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setView('mission-list')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to List
                </Button>
                <Button
                  onClick={handleProceedToPreCheck}
                  className="bg-[#21A68D] hover:bg-[#1a8a72] text-white"
                >
                  <ListChecks className="w-4 h-4 mr-2" />
                  Proceed to Pre-Check
                </Button>
              </div>
            </div>
          </Card>
        )
      }

      {/* Pre-Flight Check View */}
      {
        view === 'pre-check' && (
          <Card className="p-6 bg-card border-border">
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-[#0F4C75]/10 border border-[#0F4C75]">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-[#0F4C75]" />
                  <p className="text-sm">Complete all critical checks before launching the mission</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentCheckList.map((check) => (
                  <Card key={check.id} className={`p-4 ${checks[check.id] ? 'border-[#21A68D]' : 'border-border'}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={check.id}
                        checked={checks[check.id] || false}
                        onCheckedChange={(checked: boolean) => setChecks({ ...checks, [check.id]: !!checked })}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <label
                          htmlFor={check.id}
                          className="text-sm cursor-pointer flex items-center gap-2"
                        >
                          {check.label}
                          {check.critical && (
                            <Badge variant="outline" className="text-xs" style={{ borderColor: '#ef4444', color: '#ef4444' }}>
                              Critical
                            </Badge>
                          )}
                        </label>
                        {checks[check.id] && (
                          <p className="text-xs text-muted-foreground mt-1">✓ Verified at {new Date().toLocaleTimeString()}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {!allCurrentCriticalChecked && (
                <div className="p-4 rounded-lg border" style={{ borderColor: '#D4E268', backgroundColor: 'rgba(212, 226, 104, 0.1)' }}>
                  <p className="text-sm" style={{ color: '#D4E268' }}>
                    ⚠ All critical checks must be completed before continuing
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setView('accept-mission')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Mission
                </Button>
                <Button
                  onClick={() => setView('ai-model-selection')}
                  disabled={!allCurrentCriticalChecked}
                  className="bg-[#21A68D] hover:bg-[#1a8a72] text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Continue to AI Selection
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        )
      }

      {/* AI Model Selection View */}
      {
        view === 'ai-model-selection' && selectedMission && (
          <Card className="p-6 bg-card border-border">
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#21A68D]/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-[#21A68D]" />
                </div>
                <div>
                  <h2 className="text-xl">AI Detection Model</h2>
                  <p className="text-sm text-muted-foreground">Select one AI model to use during this mission</p>
                </div>
              </div>

              {/* AI Models Selection */}
              <RadioGroup value={selectedAIModel} onValueChange={setSelectedAIModel} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vessel Detection & Recognition */}
                <Label htmlFor="vessel-detection" className="cursor-pointer h-full">
                  <Card
                    className={`p-5 h-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-[#21A68D]/10 hover:border-[#21A68D]/50 border-2 ${selectedAIModel === 'vessel-detection'
                      ? 'border-[#21A68D] bg-[#21A68D]/5 shadow-md shadow-[#21A68D]/20'
                      : 'border-border bg-card/40'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem
                        value="vessel-detection"
                        id="vessel-detection"
                        className="mt-1 border-[#21A68D] text-[#21A68D]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Ship className="w-5 h-5" style={{ color: '#21A68D' }} />
                          <h3 className="font-bold text-white">Vessel Detection & Recognition</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Detect and identify vessels in the surveillance area with intelligent classification
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-[#21A68D]/10 text-[#21A68D] border-none text-[10px] font-bold">REAL-TIME</Badge>
                          <Badge variant="secondary" className="bg-[#21A68D]/10 text-[#21A68D] border-none text-[10px] font-bold">CLASSIFICATION</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Label>

                {/* Vessel Hull Number Recognition */}
                <Label htmlFor="hull-recognition" className="cursor-pointer h-full">
                  <Card
                    className={`p-5 h-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-[#3b82f6]/10 hover:border-[#3b82f6]/50 border-2 ${selectedAIModel === 'hull-recognition'
                      ? 'border-[#3b82f6] bg-[#3b82f6]/5 shadow-md shadow-[#3b82f6]/20'
                      : 'border-border bg-card/40'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem
                        value="hull-recognition"
                        id="hull-recognition"
                        className="mt-1 border-[#3b82f6] text-[#3b82f6]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Anchor className="w-5 h-5" style={{ color: '#3b82f6' }} />
                          <h3 className="font-bold text-white">Vessel Hull Number Recognition</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Optical Character Recognition (OCR) for precise vessel hull identification numbers
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-[#3b82f6]/10 text-[#3b82f6] border-none text-[10px] font-bold">OCR ENGINE</Badge>
                          <Badge variant="secondary" className="bg-[#3b82f6]/10 text-[#3b82f6] border-none text-[10px] font-bold">IDENTIFICATION</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Label>

                {/* Vessel Attribute Detection */}
                <Label htmlFor="vessel-attribute" className="cursor-pointer h-full">
                  <Card
                    className={`p-5 h-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-[#0F4C75]/10 hover:border-[#0F4C75]/50 border-2 ${selectedAIModel === 'vessel-attribute'
                      ? 'border-[#0F4C75] bg-[#0F4C75]/5 shadow-md shadow-[#0F4C75]/20'
                      : 'border-border bg-card/40'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem
                        value="vessel-attribute"
                        id="vessel-attribute"
                        className="mt-1 border-[#0F4C75] text-[#0F4C75]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <ListChecks className="w-5 h-5" style={{ color: '#0F4C75' }} />
                          <h3 className="font-bold text-white">Vessel Attribute Detection</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Analyze vessel attributes including size, type, and detailed operational status
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-[#0F4C75]/10 text-[#0F4C75] border-none text-[10px] font-bold">ANALYSIS</Badge>
                          <Badge variant="secondary" className="bg-[#0F4C75]/10 text-[#0F4C75] border-none text-[10px] font-bold">METADATA</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Label>

                {/* Marine Debris Detection */}
                <Label htmlFor="debris-detection" className="cursor-pointer h-full">
                  <Card
                    className={`p-5 h-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-[#D4E268]/10 hover:border-[#D4E268]/50 border-2 ${selectedAIModel === 'debris-detection'
                      ? 'border-[#D4E268] bg-[#D4E268]/5 shadow-md shadow-[#D4E268]/20'
                      : 'border-border bg-card/40'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem
                        value="debris-detection"
                        id="debris-detection"
                        className="mt-1 border-[#D4E268] text-[#D4E268]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-5 h-5" style={{ color: '#D4E268' }} />
                          <h3 className="font-bold text-white">Marine Debris Detection</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Identify and track marine debris, waste, and pollution in monitored coastal areas
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-[#D4E268]/10 text-[#D4E268] border-none text-[10px] font-bold">ECO-GUARD</Badge>
                          <Badge variant="secondary" className="bg-[#D4E268]/10 text-[#D4E268] border-none text-[10px] font-bold">DETECTION</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Label>

                {/* Event Detection & Behavior Analysis */}
                <Label htmlFor="event-detection" className="cursor-pointer h-full md:col-span-2">
                  <Card
                    className={`p-5 h-full cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-[#3b82f6]/10 hover:border-[#3b82f6]/50 border-2 ${selectedAIModel === 'event-detection'
                      ? 'border-[#3b82f6] bg-[#3b82f6]/5 shadow-md shadow-[#3b82f6]/20'
                      : 'border-border bg-card/40'
                      }`}
                  >
                    <div className="flex items-start gap-4">
                      <RadioGroupItem
                        value="event-detection"
                        id="event-detection"
                        className="mt-1 border-[#3b82f6] text-[#3b82f6]"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-5 h-5" style={{ color: '#3b82f6' }} />
                          <h3 className="font-bold text-white">Event Detection & Behavioral Analysis</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Detect specific security events like illegal fishing, unauthorized docking, or suspicious behavior
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-[#3b82f6]/10 text-[#3b82f6] border-none text-[10px] font-bold">BEHAVIORAL</Badge>
                          <Badge variant="secondary" className="bg-[#3b82f6]/10 text-[#3b82f6] border-none text-[10px] font-bold">SECURITY</Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Label>
              </RadioGroup>

              {/* Info Banner */}
              {selectedAIModel && (
                <div className="p-4 rounded-lg bg-[#21A68D]/10 border border-[#21A68D]/30">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-[#21A68D] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-[#21A68D]">
                        AI Model Selected
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        The selected model will run continuously during the mission and provide real-time detection results
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={() => setView('pre-check')}
                  className="border-border hover:bg-accent"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Pre-Check
                </Button>
                <Button
                  onClick={() => setView('pre-check-summary')}
                  disabled={!selectedAIModel}
                  className="bg-[#21A68D] hover:bg-[#1a8a72] text-white disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Continue to Summary
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </Card>
        )
      }

      {/* Pre-Check Summary View */}
      {
        view === 'pre-check-summary' && selectedMission && (
          <div className="space-y-6">
            {/* Summary Header */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#21A68D]/20 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-[#21A68D]" />
                </div>
                <div>
                  <h2 className="text-xl">Pre-Flight Check Completed</h2>
                  <p className="text-sm text-muted-foreground">All critical systems verified and ready for launch</p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-[#21A68D]/10 border border-[#21A68D]">
                <h3 className="font-medium mb-2">{selectedMission.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedMission.description}</p>
              </div>
            </Card>

            {/* Check Results Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Completed Checks */}
              <Card className="p-6 bg-card border-border">
                <h3 className="flex items-center gap-2 mb-4" style={{ color: '#21A68D' }}>
                  <CheckCircle className="w-5 h-5" />
                  Completed Checks
                </h3>
                <div className="space-y-2">
                  {currentCheckList.filter(check => checks[check.id]).map(check => (
                    <div key={check.id} className="flex items-center gap-2 p-2 rounded bg-muted/30">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm flex-1">{check.label}</span>
                      {check.critical && (
                        <Badge variant="outline" className="text-xs border-[#21A68D] text-[#21A68D]">
                          Critical
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              {/* Mission & Drone Info */}
              <Card className="p-6 bg-card border-border">
                <h3 className="flex items-center gap-2 mb-4" style={{ color: '#0F4C75' }}>
                  <Plane className="w-5 h-5" />
                  Mission Configuration
                </h3>
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Drone</p>
                    <p className="font-medium">
                      {mockDevices.find(d => d.id === selectedMission.assignedDevice)?.name}
                    </p>
                    <Badge variant="outline" className="mt-1" style={{ borderColor: '#21A68D', color: '#21A68D' }}>
                      {mockDevices.find(d => d.id === selectedMission.assignedDevice)?.type}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Team Members</p>
                    <p className="font-medium">{assignedTeam.length} members assigned</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Mission Area</p>
                    <p className="font-medium">{selectedMission.area}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Duration</p>
                    <p className="font-medium">{selectedMission.duration} days</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* AI Model Section */}
            {selectedAIModel && (
              <Card className="p-6 bg-card border-border">
                <h3 className="flex items-center gap-2 mb-4" style={{ color: '#21A68D' }}>
                  <Brain className="w-5 h-5" />
                  AI Detection Model
                </h3>
                <div className="space-y-3">
                  {selectedAIModel === 'vessel-detection' && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-[#21A68D]/10 border border-[#21A68D]/30">
                      <Ship className="w-6 h-6 text-[#21A68D] flex-shrink-0" />
                      <div>
                        <p className="font-medium">Vessel Detection & Recognition</p>
                        <p className="text-sm text-muted-foreground">Real-time vessel detection and classification</p>
                      </div>
                    </div>
                  )}
                  {selectedAIModel === 'hull-recognition' && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30">
                      <Anchor className="w-6 h-6 text-[#3b82f6] flex-shrink-0" />
                      <div>
                        <p className="font-medium">Vessel Hull Number Recognition</p>
                        <p className="text-sm text-muted-foreground">OCR for hull identification numbers</p>
                      </div>
                    </div>
                  )}
                  {selectedAIModel === 'vessel-attribute' && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-[#0F4C75]/10 border border-[#0F4C75]/30">
                      <ListChecks className="w-6 h-6 text-[#0F4C75] flex-shrink-0" />
                      <div>
                        <p className="font-medium">Vessel Attribute Detection</p>
                        <p className="text-sm text-muted-foreground">Analyze vessel attributes and status</p>
                      </div>
                    </div>
                  )}
                  {selectedAIModel === 'debris-detection' && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-[#D4E268]/10 border border-[#D4E268]/30">
                      <AlertCircle className="w-6 h-6 text-[#D4E268] flex-shrink-0" />
                      <div>
                        <p className="font-medium">Marine Debris Detection</p>
                        <p className="text-sm text-muted-foreground">Environmental monitoring and pollution detection</p>
                      </div>
                    </div>
                  )}
                  {selectedAIModel === 'event-detection' && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/30">
                      <Activity className="w-6 h-6 text-[#3b82f6] flex-shrink-0" />
                      <div>
                        <p className="font-medium">Event Detection & Behavior Analysis</p>
                        <p className="text-sm text-muted-foreground">Autonomous security event identification and alerting</p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Launch Confirmation */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-[#D4E268] mt-0.5" />
                <div>
                  <h3 className="font-medium mb-1">Ready for Launch</h3>
                  <p className="text-sm text-muted-foreground">
                    All pre-flight checks have been completed successfully. The drone is ready for mission deployment.
                    Click "Launch Mission" to begin operations.
                  </p>
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setView('ai-model-selection')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to AI Selection
              </Button>
              <Button
                onClick={handleLaunchMission}
                className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Launch Mission
              </Button>
            </div>
          </div>
        )
      }

      {/* Live Mission Summary View */}
      {
        view === 'live-mission-summary' && selectedMission && (
          <div className="space-y-6">
            {/* Mission Header with LIVE badge */}
            <Card className="p-6 bg-card border-border">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl">{selectedMission.name}</h2>
                    <div className="flex items-center gap-1 bg-[#22c55e]/20 border border-[#22c55e] px-3 py-1 rounded">
                      <div className="w-2.5 h-2.5 bg-[#22c55e] rounded-full animate-pulse" />
                      <span className="text-sm font-bold text-[#22c55e]">LIVE</span>
                    </div>
                  </div>
                  <p className="text-muted-foreground">{selectedMission.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <Card className="p-4 bg-muted/30 border-border">
                  <p className="text-xs text-muted-foreground mb-1">Mission Time</p>
                  <p className="text-xl font-semibold" style={{ color: '#21A68D' }}>
                    {Math.floor((new Date().getTime() - new Date(selectedMission.createdAt).getTime()) / 1000 / 60)} min
                  </p>
                </Card>
                <Card className="p-4 bg-muted/30 border-border">
                  <p className="text-xs text-muted-foreground mb-1">Category</p>
                  <p className="text-sm font-semibold">{selectedMission.category}</p>
                </Card>
                <Card className="p-4 bg-muted/30 border-border">
                  <p className="text-xs text-muted-foreground mb-1">Area</p>
                  <p className="text-sm font-semibold">{selectedMission.area}</p>
                </Card>
                <Card className="p-4 bg-muted/30 border-border">
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className="text-sm font-semibold text-[#22c55e]">Active</p>
                </Card>
              </div>
            </Card>

            {/* Team & Drone Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team Members */}
              <Card className="p-6 bg-card border-border">
                <h3 className="flex items-center gap-2 mb-4" style={{ color: '#21A68D' }}>
                  <Users className="w-5 h-5" />
                  Team Members
                </h3>
                <div className="space-y-3">
                  {assignedTeam.map(teamId => {
                    const member = mockTeamMembers.find(m => m.id === teamId);
                    return member ? (
                      <div key={teamId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                        <div className="w-10 h-10 rounded-full bg-[#21A68D] flex items-center justify-center text-white">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{member.name}</p>
                          <p className="text-sm text-muted-foreground">{member.role}</p>
                        </div>
                        <Badge variant="outline" className="border-green-500 text-green-500">
                          Active
                        </Badge>
                      </div>
                    ) : null;
                  })}
                </div>
              </Card>

              {/* Drone Info */}
              <Card className="p-6 bg-card border-border">
                <h3 className="flex items-center gap-2 mb-4" style={{ color: '#0F4C75' }}>
                  <Radio className="w-5 h-5" />
                  Drone Information
                </h3>
                {(() => {
                  const device = mockDevices.find(d => d.id === selectedMission.assignedDevice);
                  return device ? (
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-medium text-lg">{device.name}</h4>
                            <Badge variant="outline" className="mt-1">
                              {device.type}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="border-green-500 text-green-500">
                            Operating
                          </Badge>
                        </div>
                        <div className="space-y-3 mt-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-muted-foreground">Battery Level:</span>
                              <span className="text-green-500 font-medium">{device.battery}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div className="h-2 rounded-full bg-green-500" style={{ width: `${device.battery}%` }} />
                            </div>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Signal Strength:</span>
                            <span className="text-green-500 font-medium">95%</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Altitude:</span>
                            <span className="font-medium">127m</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Speed:</span>
                            <span className="font-medium">12.3 km/h</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}
              </Card>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setView('mission-list')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
              <Button
                onClick={() => setView('live-mission-detail')}
                className="bg-[#22c55e] hover:bg-[#22c55e]/90 text-white"
              >
                <Radio className="w-4 h-4 mr-2" />
                View Live Operations
              </Button>
            </div>
          </div>
        )
      }

      {/* Live Mission Detail View - Embedded Live Operations */}
      {
        view === 'live-mission-detail' && selectedMission && (
          <div className="h-full flex flex-col">
            {/* Header with mission info */}
            <div className="px-4 md:px-6 pt-4 pb-3 border-b border-border bg-card">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setView('live-mission-summary')}
                    className="gap-2 shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-medium">{selectedMission.name}</h2>
                    <div className="flex items-center gap-1 bg-[#22c55e]/20 border border-[#22c55e] px-2 py-0.5 rounded">
                      <div className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-[#22c55e]">LIVE</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{selectedMission.description}</p>
            </div>

            {/* Live Operations Content - Embedded */}
            <div className="flex-1 overflow-hidden">
              <LiveOperations />
            </div>
          </div>
        )
      }
      {
        view === 'post-analysis' && (
          <div className="space-y-6">
            <Card className="p-6 bg-card border-border">
              <div className="text-center text-muted-foreground py-12">
                <p className="text-lg font-semibold">Post Analysis</p>
                <p className="text-sm mt-2">Analysis results will appear here after mission completion.</p>
              </div>
            </Card>
          </div>
        )
      }
      {
        view === 'event-detection' && (
          <div className="space-y-6">

            <Card className="p-6 bg-card border-border">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-6 h-6 text-[#3b82f6]" />
                <div>
                  <h2 className="text-xl font-semibold">Event Detection Log</h2>
                  <p className="text-sm text-muted-foreground">Behavioral anomalies and security event history</p>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { id: 1, type: 'Illegal Fishing', location: 'Zone A-12', time: '10:24 AM', confidence: '94%' },
                  { id: 2, type: 'Unauthorized Docking', location: 'East Pier', time: '09:15 AM', confidence: '88%' },
                  { id: 3, type: 'Border Intrusion', location: 'Northern Edge', time: 'Yesterday', confidence: '91%' },
                ].map((event) => (
                  <div key={event.id} className="p-4 rounded-lg bg-muted/30 border border-border flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded bg-[#3b82f6]/10 text-[#3b82f6]">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{event.type}</p>
                        <p className="text-xs text-muted-foreground">{event.location} • {event.time}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[#3b82f6] border-[#3b82f6]">
                      {event.confidence} Match
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )
      }
    </div>
  );
}