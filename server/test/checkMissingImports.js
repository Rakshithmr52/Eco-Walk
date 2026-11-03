const fs = require('fs');

function checkFile(filePath, customList) {
  const code = fs.readFileSync(filePath, 'utf8');
  const lucideImports = code.match(/import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/);
  const imported = lucideImports ? lucideImports[1].split(',').map(s => s.trim()).filter(Boolean) : [];
  
  const tagMatches = code.matchAll(/<([A-Z][a-zA-Z0-9]+)/g);
  const usedTags = new Set();
  for (const m of tagMatches) usedTags.add(m[1]);
  
  const missing = [];
  for (const tag of usedTags) {
    if (customList.includes(tag)) continue;
    if (!imported.includes(tag)) missing.push(tag);
  }
  console.log(`File: ${filePath}`);
  console.log('Missing imports:', missing);
}

checkFile('client/src/pages/RoutePlanner.jsx', [
  'MapVisualizer', 'RouteCard', 'RouteComparisonTable', 'FeedbackModal', 'ReportHazardModal'
]);

checkFile('client/src/components/MapVisualizer.jsx', [
  'MapContainer', 'TileLayer', 'Marker', 'Popup', 'Polyline', 'Circle',
  'MapBoundsHandler', 'MapClickHandler', 'MapControls'
]);

checkFile('client/src/components/ReportHazardModal.jsx', [
  'MapContainer', 'TileLayer', 'Marker', 'Popup', 'Polyline', 'Circle',
  'MiniMapClickHandler', 'MiniMapCenterHandler'
]);

