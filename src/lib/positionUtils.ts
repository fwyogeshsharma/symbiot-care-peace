export interface Position {
  x: number;
  y: number;
  zone: string;
  accuracy?: number;
  speed?: number;
}

export interface Zone {
  name: string;
  coordinates: { x: number; y: number }[];
  color: string;
}

export interface FurnitureItem {
  id: string;
  type: 'bed' | 'chair' | 'table' | 'sofa' | 'desk' | 'toilet' | 'sink' | 'door';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface FloorPlan {
  id: string;
  elderly_person_id: string;
  name: string;
  width: number;
  height: number;
  grid_size: number;
  zones: Zone[];
  furniture?: FurnitureItem[];
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface PositionEvent {
  id: string;
  timestamp: Date;
  position: Position;
  deviceName: string;
}

export interface ProcessedPositionData {
  events: PositionEvent[];
  zoneStats: Record<string, { duration: number; visits: number }>;
  totalDistance: number;
  averageSpeed: number;
}

// Generate realistic indoor movement path using random walk
export const generateIndoorMovementPath = (
  zones: Zone[],
  floorPlan: { width: number; height: number },
  startTime: Date,
  durationHours: number = 24,
  intervalSeconds: number = 30
): Position[] => {
  const positions: Position[] = [];
  const totalPoints = (durationHours * 3600) / intervalSeconds;
  
  // Start in a random zone
  let currentZone = zones[Math.floor(Math.random() * zones.length)];
  let currentPos = getRandomPointInZone(currentZone);
  
  // Movement parameters
  let velocityX = 0;
  let velocityY = 0;
  const maxSpeed = 1.5; // meters per second (walking speed)
  const momentum = 0.7; // How much previous velocity affects next move
  
  for (let i = 0; i < totalPoints; i++) {
    const timestamp = new Date(startTime.getTime() + i * intervalSeconds * 1000);
    
    // Decide if stationary (20% chance) or moving
    if (Math.random() < 0.2) {
      // Stationary - stay in same position for a while
      positions.push({
        ...currentPos,
        zone: currentZone.name,
        accuracy: 0.5 + Math.random() * 0.5,
        speed: 0
      });
      continue;
    }
    
    // Apply momentum and add random direction change
    velocityX = velocityX * momentum + (Math.random() - 0.5) * 0.5;
    velocityY = velocityY * momentum + (Math.random() - 0.5) * 0.5;
    
    // Limit speed
    const speed = Math.sqrt(velocityX ** 2 + velocityY ** 2);
    if (speed > maxSpeed) {
      velocityX = (velocityX / speed) * maxSpeed;
      velocityY = (velocityY / speed) * maxSpeed;
    }
    
    // Calculate new position
    let newX = currentPos.x + velocityX * intervalSeconds;
    let newY = currentPos.y + velocityY * intervalSeconds;
    
    // Check boundaries
    newX = Math.max(0.5, Math.min(floorPlan.width - 0.5, newX));
    newY = Math.max(0.5, Math.min(floorPlan.height - 0.5, newY));
    
    // Check if we're in a zone
    const newZone = findZoneAtPosition({ x: newX, y: newY }, zones);
    
    if (newZone) {
      currentZone = newZone;
      currentPos = { x: newX, y: newY };
    } else {
      // Outside zones, move towards nearest zone
      const nearestZone = getNearestZone({ x: newX, y: newY }, zones);
      const zoneCenter = getZoneCenter(nearestZone);
      velocityX += (zoneCenter.x - newX) * 0.1;
      velocityY += (zoneCenter.y - newY) * 0.1;
    }
    
    positions.push({
      x: currentPos.x,
      y: currentPos.y,
      zone: currentZone.name,
      accuracy: 0.3 + Math.random() * 0.7,
      speed: Math.sqrt(velocityX ** 2 + velocityY ** 2)
    });
  }
  
  return positions;
};

// Get random point within a zone polygon
const getRandomPointInZone = (zone: Zone): { x: number; y: number } => {
  if (zone.coordinates.length === 0) {
    return { x: 5, y: 5 };
  }
  
  // Get bounding box
  const xs = zone.coordinates.map(c => c.x);
  const ys = zone.coordinates.map(c => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  
  // Try random points until one is inside
  for (let i = 0; i < 100; i++) {
    const x = minX + Math.random() * (maxX - minX);
    const y = minY + Math.random() * (maxY - minY);
    if (isPointInPolygon({ x, y }, zone.coordinates)) {
      return { x, y };
    }
  }
  
  // Fallback to center of bounding box
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2
  };
};

// Check if point is inside polygon using ray casting
const isPointInPolygon = (
  point: { x: number; y: number },
  polygon: { x: number; y: number }[]
): boolean => {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Find which zone contains a position
const findZoneAtPosition = (
  position: { x: number; y: number },
  zones: Zone[]
): Zone | null => {
  for (const zone of zones) {
    if (isPointInPolygon(position, zone.coordinates)) {
      return zone;
    }
  }
  return null;
};

// Get nearest zone to a position
const getNearestZone = (
  position: { x: number; y: number },
  zones: Zone[]
): Zone => {
  let minDist = Infinity;
  let nearest = zones[0];
  
  for (const zone of zones) {
    const center = getZoneCenter(zone);
    const dist = Math.sqrt((center.x - position.x) ** 2 + (center.y - position.y) ** 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = zone;
    }
  }
  
  return nearest;
};

// Get center of zone
const getZoneCenter = (zone: Zone): { x: number; y: number } => {
  const xs = zone.coordinates.map(c => c.x);
  const ys = zone.coordinates.map(c => c.y);
  return {
    x: xs.reduce((a, b) => a + b, 0) / xs.length,
    y: ys.reduce((a, b) => a + b, 0) / ys.length
  };
};

// Calculate total distance traveled
export const calculateTotalDistance = (positions: Position[]): number => {
  let total = 0;
  for (let i = 1; i < positions.length; i++) {
    const dx = positions[i].x - positions[i - 1].x;
    const dy = positions[i].y - positions[i - 1].y;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
};

// Helper function to extract position from various data formats
const extractPosition = (value: any): Position | null => {
  if (!value) return null;
  
  // Direct Position object: { x: number, y: number, zone: string }
  if (typeof value.x === 'number' && typeof value.y === 'number') {
    return {
      x: value.x,
      y: value.y,
      zone: value.zone || 'Unknown',
      accuracy: value.accuracy,
      speed: value.speed
    };
  }
  
  // Nested position object: { position: { x, y }, zone }
  if (value.position && typeof value.position.x === 'number' && typeof value.position.y === 'number') {
    return {
      x: value.position.x,
      y: value.position.y,
      zone: value.zone || value.position.zone || 'Unknown',
      accuracy: value.accuracy || value.position.accuracy,
      speed: value.speed || value.position.speed
    };
  }
  
  // Coordinate format: { coordinates: { x, y } }
  if (value.coordinates && typeof value.coordinates.x === 'number' && typeof value.coordinates.y === 'number') {
    return {
      x: value.coordinates.x,
      y: value.coordinates.y,
      zone: value.zone || 'Unknown',
      accuracy: value.accuracy,
      speed: value.speed
    };
  }
  
  // Array format: [x, y]
  if (Array.isArray(value) && value.length >= 2 && typeof value[0] === 'number' && typeof value[1] === 'number') {
    return {
      x: value[0],
      y: value[1],
      zone: 'Unknown',
      accuracy: undefined,
      speed: undefined
    };
  }
  
  // String coordinates: "x,y"
  if (typeof value === 'string' && value.includes(',')) {
    const parts = value.split(',').map(s => parseFloat(s.trim()));
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return {
        x: parts[0],
        y: parts[1],
        zone: 'Unknown',
        accuracy: undefined,
        speed: undefined
      };
    }
  }
  
  return null;
};

// Process position data for analytics
export const processPositionData = (
  rawData: any[],
  intervalSeconds: number = 30
): ProcessedPositionData => {
  const events: PositionEvent[] = [];
  const zoneStats: Record<string, { duration: number; visits: number }> = {};
  let totalDistance = 0;
  let totalSpeed = 0;
  let speedCount = 0;
  let prevPosition: Position | null = null;
  
  rawData.forEach((item, index) => {
    if (item.data_type !== 'position') return;
    
    const position = extractPosition(item.value);
    if (!position) {
      console.warn('Could not extract position from data:', item.value);
      return;
    }
    
    const timestamp = new Date(item.recorded_at);
    
    events.push({
      id: item.id,
      timestamp,
      position,
      deviceName: item.devices?.device_name || 'Unknown'
    });
    
    // Track zone statistics
    if (!zoneStats[position.zone]) {
      zoneStats[position.zone] = { duration: 0, visits: 1 };
    } else {
      zoneStats[position.zone].duration += intervalSeconds;
      // Count a new visit if we left and came back
      if (prevPosition && prevPosition.zone !== position.zone) {
        zoneStats[position.zone].visits++;
      }
    }
    
    // Calculate distance
    if (prevPosition) {
      if (
        typeof position.x === 'number' &&
        typeof position.y === 'number' &&
        typeof prevPosition.x === 'number' &&
        typeof prevPosition.y === 'number' &&
        !isNaN(position.x) &&
        !isNaN(position.y) &&
        !isNaN(prevPosition.x) &&
        !isNaN(prevPosition.y)
      ) {
        const dx = position.x - prevPosition.x;
        const dy = position.y - prevPosition.y;
        totalDistance += Math.sqrt(dx * dx + dy * dy);
      }
    }
    
    // Track speed
    if (position.speed !== undefined) {
      totalSpeed += position.speed;
      speedCount++;
    }
    
    prevPosition = position;
  });
  
  return {
    events,
    zoneStats,
    totalDistance,
    averageSpeed: speedCount > 0 ? totalSpeed / speedCount : 0
  };
};

// Get default floor plan for demos
export const getDefaultFloorPlan = (elderlyPersonId: string): Omit<FloorPlan, 'id' | 'created_at' | 'updated_at'> => {
  return {
    elderly_person_id: elderlyPersonId,
    name: 'Main House Floor Plan',
    width: 15,
    height: 12,
    grid_size: 1.0,
    zones: [
      {
        name: 'Living Room',
        coordinates: [
          { x: 1, y: 1 },
          { x: 7, y: 1 },
          { x: 7, y: 6 },
          { x: 1, y: 6 }
        ],
        color: '#3b82f6'
      },
      {
        name: 'Kitchen',
        coordinates: [
          { x: 7, y: 1 },
          { x: 14, y: 1 },
          { x: 14, y: 5 },
          { x: 7, y: 5 }
        ],
        color: '#10b981'
      },
      {
        name: 'Bedroom',
        coordinates: [
          { x: 1, y: 6 },
          { x: 6, y: 6 },
          { x: 6, y: 11 },
          { x: 1, y: 11 }
        ],
        color: '#8b5cf6'
      },
      {
        name: 'Bathroom',
        coordinates: [
          { x: 6, y: 6 },
          { x: 9, y: 6 },
          { x: 9, y: 9 },
          { x: 6, y: 9 }
        ],
        color: '#06b6d4'
      },
      {
        name: 'Hallway',
        coordinates: [
          { x: 9, y: 5 },
          { x: 14, y: 5 },
          { x: 14, y: 11 },
          { x: 9, y: 11 }
        ],
        color: '#64748b'
      }
    ]
  };
};
