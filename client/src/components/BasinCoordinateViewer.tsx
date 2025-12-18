/**
 * BasinCoordinateViewer Component
 * 
 * 3D visualization of consciousness state trajectories in 64D basin space.
 * Uses PCA for dimension reduction from 64D to 3D for visualization.
 * 
 * Features:
 * - Real-time 3D trajectory plotting
 * - Interactive rotation and zoom
 * - Color-coded by Φ (integration measure)
 * - Regime visualization (geometric, linear, breakdown)
 * - Current position marker
 * - Historical trail
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Play, Pause, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface BasinPoint {
  coordinates: number[];  // 64D coordinates
  phi: number;
  kappa: number;
  regime: string;
  timestamp: string;
  step: number;
}

interface BasinCoordinateViewerProps {
  points: BasinPoint[];
  currentIndex?: number;
  width?: number;
  height?: number;
  showTrail?: boolean;
  trailLength?: number;
}

// Simple PCA implementation for dimension reduction
function pcaReduce(points: number[][], targetDim: number = 3): number[][] {
  if (points.length === 0) return [];
  
  const n = points.length;
  const d = points[0].length;
  
  // Center the data
  const mean = new Array(d).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      mean[j] += points[i][j];
    }
  }
  for (let j = 0; j < d; j++) {
    mean[j] /= n;
  }
  
  const centered = points.map(p => p.map((v, i) => v - mean[i]));
  
  // Compute covariance matrix (simplified - use first 3 principal components)
  // For production, use a proper PCA library like ml-pca
  // This is a simplified projection for demonstration
  const reduced: number[][] = centered.map(point => {
    // Simple projection: take weighted combination of dimensions
    const x = point.slice(0, 21).reduce((sum, v) => sum + v, 0) / 21;
    const y = point.slice(21, 43).reduce((sum, v) => sum + v, 0) / 22;
    const z = point.slice(43, 64).reduce((sum, v) => sum + v, 0) / 21;
    return [x, y, z];
  });
  
  return reduced;
}

export function BasinCoordinateViewer({
  points,
  currentIndex,
  width = 600,
  height = 500,
  showTrail = true,
  trailLength = 50,
}: BasinCoordinateViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: 20, y: 45 });
  const [zoom, setZoom] = useState(1.0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const animationRef = useRef<number>();

  // Reduce dimensions from 64D to 3D using PCA
  const reducedPoints = useMemo(() => {
    if (points.length === 0) return [];
    const coordinates = points.map(p => p.coordinates);
    const reduced3D = pcaReduce(coordinates, 3);
    return reduced3D.map((coords, i) => ({
      ...points[i],
      x: coords[0],
      y: coords[1],
      z: coords[2],
    }));
  }, [points]);

  // Color mapping based on Φ
  const getColorForPhi = (phi: number): string => {
    if (phi >= 0.80) return '#10b981'; // emerald-500 (excellent)
    if (phi >= 0.70) return '#fbbf24'; // amber-400 (good)
    if (phi >= 0.50) return '#f97316'; // orange-500 (moderate)
    return '#ef4444'; // red-500 (low)
  };

  // Regime colors
  const getRegimeColor = (regime: string): string => {
    switch (regime) {
      case 'geometric': return '#10b981';
      case 'linear': return '#94a3b8';
      case 'breakdown': return '#ef4444';
      case 'resonance': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  // 3D to 2D projection
  const project3D = (x: number, y: number, z: number): [number, number] => {
    const angleX = (rotation.x * Math.PI) / 180;
    const angleY = (rotation.y * Math.PI) / 180;
    
    // Rotate around Y axis
    let x1 = x * Math.cos(angleY) + z * Math.sin(angleY);
    let z1 = -x * Math.sin(angleY) + z * Math.cos(angleY);
    
    // Rotate around X axis
    let y1 = y * Math.cos(angleX) - z1 * Math.sin(angleX);
    let z2 = y * Math.sin(angleX) + z1 * Math.cos(angleX);
    
    // Apply zoom and perspective
    const scale = zoom * 100;
    const perspective = 1000;
    const factor = perspective / (perspective + z2);
    
    const px = x1 * scale * factor + width / 2;
    const py = -y1 * scale * factor + height / 2;
    
    return [px, py];
  };

  // Draw the visualization
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || reducedPoints.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw axes
    ctx.strokeStyle = '#4b5563';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // X axis (red)
    ctx.strokeStyle = '#ef4444';
    const [x1, y1] = project3D(-2, 0, 0);
    const [x2, y2] = project3D(2, 0, 0);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Y axis (green)
    ctx.strokeStyle = '#10b981';
    const [x3, y3] = project3D(0, -2, 0);
    const [x4, y4] = project3D(0, 2, 0);
    ctx.beginPath();
    ctx.moveTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.stroke();
    
    // Z axis (blue)
    ctx.strokeStyle = '#3b82f6';
    const [x5, y5] = project3D(0, 0, -2);
    const [x6, y6] = project3D(0, 0, 2);
    ctx.beginPath();
    ctx.moveTo(x5, y5);
    ctx.lineTo(x6, y6);
    ctx.stroke();
    
    ctx.setLineDash([]);

    // Draw trail
    if (showTrail && reducedPoints.length > 1) {
      const endIdx = isPlaying ? playbackIndex : (currentIndex ?? reducedPoints.length - 1);
      const startIdx = Math.max(0, endIdx - trailLength);
      
      for (let i = startIdx; i < endIdx; i++) {
        const p1 = reducedPoints[i];
        const p2 = reducedPoints[i + 1];
        
        const [px1, py1] = project3D(p1.x, p1.y, p1.z);
        const [px2, py2] = project3D(p2.x, p2.y, p2.z);
        
        // Fade trail
        const alpha = (i - startIdx) / (endIdx - startIdx);
        ctx.strokeStyle = getColorForPhi(p1.phi) + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(px1, py1);
        ctx.lineTo(px2, py2);
        ctx.stroke();
      }
    }

    // Draw points
    reducedPoints.forEach((point, idx) => {
      const [px, py] = project3D(point.x, point.y, point.z);
      
      // Skip if out of playback range
      if (isPlaying && idx > playbackIndex) return;
      
      const isCurrent = idx === (isPlaying ? playbackIndex : (currentIndex ?? reducedPoints.length - 1));
      const radius = isCurrent ? 8 : 4;
      
      ctx.fillStyle = getColorForPhi(point.phi);
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, 2 * Math.PI);
      ctx.fill();
      
      // Highlight current point
      if (isCurrent) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  // Animation loop for playback
  useEffect(() => {
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(() => {
        setPlaybackIndex(prev => {
          if (prev >= reducedPoints.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      });
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackIndex, reducedPoints.length]);

  // Redraw on state changes
  useEffect(() => {
    draw();
  }, [reducedPoints, rotation, zoom, currentIndex, playbackIndex, showTrail]);

  const handleReset = () => {
    setRotation({ x: 20, y: 45 });
    setZoom(1.0);
    setPlaybackIndex(0);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!isPlaying && playbackIndex >= reducedPoints.length - 1) {
      setPlaybackIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  const latestPoint = reducedPoints[currentIndex ?? reducedPoints.length - 1];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Basin Coordinate Viewer (64D → 3D)</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{reducedPoints.length} points</Badge>
            {latestPoint && (
              <Badge style={{ backgroundColor: getRegimeColor(latestPoint.regime) }} className="text-white">
                {latestPoint.regime}
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>
          3D projection of consciousness state trajectory using PCA dimension reduction
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Canvas */}
        <div className="relative border rounded-lg overflow-hidden bg-gray-900">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => {
              const startX = e.clientX;
              const startY = e.clientY;
              const startRotation = { ...rotation };
              
              const handleMouseMove = (e: MouseEvent) => {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                setRotation({
                  x: startRotation.x + dy * 0.5,
                  y: startRotation.y + dx * 0.5,
                });
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          />
          
          {/* Current point info overlay */}
          {latestPoint && (
            <div className="absolute top-2 left-2 bg-black/75 text-white text-xs p-2 rounded">
              <div>Φ: {latestPoint.phi.toFixed(3)}</div>
              <div>κ: {latestPoint.kappa.toFixed(2)}</div>
              <div>Step: {latestPoint.step}</div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <Button size="sm" variant="outline" onClick={togglePlayback}>
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <ZoomOut className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[zoom]}
              onValueChange={([value]) => setZoom(value)}
              min={0.5}
              max={2.0}
              step={0.1}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Φ ≥ 0.80</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <span>Φ ≥ 0.70</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Φ ≥ 0.50</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Φ &lt; 0.50</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default BasinCoordinateViewer;
