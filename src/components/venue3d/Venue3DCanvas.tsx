/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  RotateCcw,
  Maximize2,
  Trash2,
  Plus,
  Move,
  Layers,
  Eye,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Sun,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import { EventData, LayoutObject, LayoutObjectType } from '../../types';
import { buildCompositeModel } from './proceduralModels';
import { evaluateVenueCapacity, isObjectWithinBounds } from '../../logic/capacityEngine';

interface Venue3DCanvasProps {
  event: EventData;
  onUpdateLayout: (newObjects: LayoutObject[]) => void;
}

/**
 * Traverses an Object3D hierarchy and disposes all mesh geometries to prevent GPU memory leaks
 */
function disposeObjectHierarchy(root: THREE.Object3D) {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
    }
  });
}

export const Venue3DCanvas: React.FC<Venue3DCanvasProps> = ({ event, onUpdateLayout }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewPreset, setViewPreset] = useState<'iso' | 'top' | 'indoor' | 'outdoor'>('iso');
  const [activeZoneFilter, setActiveZoneFilter] = useState<'all' | 'indoor' | 'outdoor'>('all');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'inspect' | 'add' | 'camera' | 'capacity'>('inspect');
  const [is2DFallback, setIs2DFallback] = useState(false);

  // Mutable refs for Three.js state that shouldn't trigger React renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsGroupRef = useRef<THREE.Group | null>(null);
  const rainSystemRef = useRef<THREE.Points | null>(null);
  const movingLightsRef = useRef<THREE.SpotLight[]>([]);

  // Smooth camera preset interpolation targets
  const targetCamPosRef = useRef<THREE.Vector3 | null>(null);
  const targetLookAtRef = useRef<THREE.Vector3 | null>(null);
  const isTransitioningCamRef = useRef(false);

  const selectedItem = event.layoutObjects.find((o) => o.id === selectedId);
  const capacityStats = evaluateVenueCapacity(event.venue, event.layoutObjects, event.expectedAttendance);
  const isRainCrisis = event.activeIncidentReport?.incidentType === 'heavy_rain';

  // 1. Initialize Scene & Three.js Renderer
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xfaf8f5); // Warm ivory horizon
    scene.fog = new THREE.FogExp2(0xfaf8f5, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.2, 500);
    camera.position.set(16, 18, 22);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch {
      setIs2DFallback(true);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // Studio Environment Map via RoomEnvironment & PMREMGenerator
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch (e) {
      console.warn('PMREM environment init note:', e);
    }

    // Camera OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03; // Don't go below floor
    controls.minDistance = 4;
    controls.maxDistance = 90;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    // Cancel scripted camera transitions when user starts interacting manually
    controls.addEventListener('start', () => {
      isTransitioningCamRef.current = false;
    });

    // Lighting Rig
    // 1. Cool Sky / Warm Ground Hemisphere fill
    const hemiLight = new THREE.HemisphereLight(0xeef6ff, 0xd4cbbd, 0.75);
    scene.add(hemiLight);

    // 2. Warm Key Directional Sunlight
    const dirLight = new THREE.DirectionalLight(0xfff6e8, 1.4);
    dirLight.position.set(20, 30, 15);
    dirLight.castShadow = !isSoftwareGl;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    const d = 28;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0004;
    scene.add(dirLight);

    // 3. Fill Directional Light (rim/soften)
    const rimLight = new THREE.DirectionalLight(0x8cb5a3, 0.4);
    rimLight.position.set(-18, 12, -20);
    scene.add(rimLight);

    // 4. Moving Stage Spotlights (Animated visual flair)
    const spot1 = new THREE.SpotLight(0xc59b27, 4.5, 30, Math.PI / 8, 0.4);
    spot1.position.set(-4, 9, -5);
    scene.add(spot1);

    const spot2 = new THREE.SpotLight(0x22d3ee, 4.5, 30, Math.PI / 8, 0.4);
    spot2.position.set(4, 9, -5);
    scene.add(spot2);

    movingLightsRef.current = [spot1, spot2];

    // Build Venue Base Architecture (Indoor Hall + Outdoor Lawn)
    const venueGroup = new THREE.Group();
    scene.add(venueGroup);

    // Indoor Auditorium Floor (Polished parquet/warm travertine)
    const inW = event.venue.indoorWidth || 26;
    const inL = (event.venue.indoorLength || 32) / 2; // Front half of venue
    const inFloorGeo = new THREE.PlaneGeometry(inW, inL);
    const inFloorMat = new THREE.MeshStandardMaterial({
      color: 0xede8e1,
      roughness: 0.35,
      metalness: 0.1,
    });
    const indoorFloor = new THREE.Mesh(inFloorGeo, inFloorMat);
    indoorFloor.rotation.x = -Math.PI / 2;
    indoorFloor.position.set(0, 0, inL / 2);
    indoorFloor.receiveShadow = true;
    venueGroup.add(indoorFloor);

    // Indoor Boundary Low Curators Wall
    const inWallMat = new THREE.MeshStandardMaterial({
      color: 0xded8ce,
      roughness: 0.8,
    });
    const backWallGeo = new THREE.BoxGeometry(inW, 4, 0.4);
    const backWall = new THREE.Mesh(backWallGeo, inWallMat);
    backWall.position.set(0, 2, inL);
    venueGroup.add(backWall);

    // Outdoor Lawn Floor (Natural grass / terrace)
    const outW = event.venue.outdoorWidth || 30;
    const outL = (event.venue.outdoorLength || 36) / 2;
    const outFloorGeo = new THREE.PlaneGeometry(outW, outL);
    const outFloorMat = new THREE.MeshStandardMaterial({
      color: 0x4f6b55, // Natural muted emerald grass
      roughness: 0.9,
      metalness: 0.05,
    });
    const outdoorFloor = new THREE.Mesh(outFloorGeo, outFloorMat);
    outdoorFloor.rotation.x = -Math.PI / 2;
    outdoorFloor.position.set(0, -0.01, -outL / 2);
    outdoorFloor.receiveShadow = true;
    venueGroup.add(outdoorFloor);

    // Stone Terrace Separator Divider
    const dividerGeo = new THREE.BoxGeometry(outW + 2, 0.15, 0.8);
    const dividerMat = new THREE.MeshStandardMaterial({
      color: 0xc8c2b7,
      roughness: 0.6,
      metalness: 0.2,
    });
    const divider = new THREE.Mesh(dividerGeo, dividerMat);
    divider.position.set(0, 0.075, 0);
    venueGroup.add(divider);

    // Subtle Ground Grid lines for spatial orientation
    const gridHelper = new THREE.GridHelper(36, 18, 0x0d3b2e, 0xd0c9bd);
    gridHelper.position.y = 0.002;
    venueGroup.add(gridHelper);

    // Procedural Rain Particle System (for weather crises)
    const rainCount = 500;
    const rainGeo = new THREE.BufferGeometry();
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * outW;
      rainPositions[i * 3 + 1] = Math.random() * 14;
      rainPositions[i * 3 + 2] = -Math.random() * outL;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.16,
      transparent: true,
      opacity: 0.75,
    });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    rainSystem.visible = false;
    scene.add(rainSystem);
    rainSystemRef.current = rainSystem;

    // Group for dynamic interactive layout objects
    const objectsGroup = new THREE.Group();
    scene.add(objectsGroup);
    objectsGroupRef.current = objectsGroup;

    // Raycasting Selection
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handlePointerDown = (eventMouse: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((eventMouse.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((eventMouse.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(objectsGroup.children, true);

      if (intersects.length > 0) {
        let curr: THREE.Object3D | null = intersects[0].object;
        while (curr && curr.parent !== objectsGroup) {
          curr = curr.parent;
        }
        if (curr && curr.userData?.id) {
          setSelectedId(curr.userData.id);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // Resize observer
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Render Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Camera preset smooth transition
      if (isTransitioningCamRef.current && targetCamPosRef.current && targetLookAtRef.current) {
        camera.position.lerp(targetCamPosRef.current, 1 - Math.exp(-6 * delta));
        controls.target.lerp(targetLookAtRef.current, 1 - Math.exp(-6 * delta));
        if (
          camera.position.distanceTo(targetCamPosRef.current) < 0.08 &&
          controls.target.distanceTo(targetLookAtRef.current) < 0.08
        ) {
          isTransitioningCamRef.current = false;
        }
      }

      controls.update();

      // Moving stage spotlights oscillation
      if (movingLightsRef.current.length >= 2) {
        const sweepX1 = Math.sin(elapsedTime * 0.9) * 4;
        const sweepZ1 = -10 + Math.cos(elapsedTime * 0.9) * 2;
        movingLightsRef.current[0].target.position.set(sweepX1, 1, sweepZ1);
        movingLightsRef.current[0].target.updateMatrixWorld();

        const sweepX2 = Math.cos(elapsedTime * 0.8) * 4;
        const sweepZ2 = -10 + Math.sin(elapsedTime * 0.8) * 2;
        movingLightsRef.current[1].target.position.set(sweepX2, 1, sweepZ2);
        movingLightsRef.current[1].target.updateMatrixWorld();
      }

      // Smooth furniture relocation interpolation (glide to new coordinates!)
      if (objectsGroupRef.current) {
        objectsGroupRef.current.children.forEach((child) => {
          if (child.userData?.targetPosition) {
            child.position.lerp(child.userData.targetPosition, 1 - Math.exp(-5 * delta));
          }
        });
      }

      // Rain animation if visible
      if (rainSystemRef.current && rainSystemRef.current.visible) {
        const positions = rainSystemRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 0; i < rainCount; i++) {
          positions[i * 3 + 1] -= delta * 20;
          if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 14;
          }
        }
        rainSystemRef.current.geometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      if (objectsGroupRef.current) {
        disposeObjectHierarchy(objectsGroupRef.current);
      }
      if (rainSystemRef.current) {
        rainSystemRef.current.geometry.dispose();
      }
      renderer.dispose();
      controls.dispose();
      container.replaceChildren();
    };
  }, [event.venue]);

  // 2. Synchronize Dynamic Layout Objects in 3D Scene with Smooth Movement Interpolation
  useEffect(() => {
    const group = objectsGroupRef.current;
    if (!group) return;

    // Toggle rain visibility based on crisis
    if (rainSystemRef.current) {
      rainSystemRef.current.visible = isRainCrisis;
    }

    const existingMeshesMap = new Map<string, THREE.Group>();
    group.children.forEach((child) => {
      if (child.userData?.id) {
        existingMeshesMap.set(child.userData.id, child as THREE.Group);
      }
    });

    const activeIds = new Set<string>();

    event.layoutObjects.forEach((item) => {
      if (activeZoneFilter !== 'all' && item.zone !== activeZoneFilter) {
        return;
      }
      activeIds.add(item.id);

      const existingMesh = existingMeshesMap.get(item.id);
      const isSelected = item.id === selectedId;

      if (existingMesh) {
        // Smoothly interpolate position if changed (e.g. during crisis recovery relocation!)
        const targetPos = new THREE.Vector3(item.position[0], item.position[1], item.position[2]);
        existingMesh.userData.targetPosition = targetPos;
        existingMesh.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
        existingMesh.scale.set(item.scale[0], item.scale[1], item.scale[2]);
      } else {
        // Create new composite procedural model
        const newMesh = buildCompositeModel(item, isSelected);
        newMesh.userData.targetPosition = new THREE.Vector3(
          item.position[0],
          item.position[1],
          item.position[2]
        );
        group.add(newMesh);
      }
    });

    // Remove deleted objects and dispose their GPU geometries
    existingMeshesMap.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        disposeObjectHierarchy(mesh);
        group.remove(mesh);
      }
    });
  }, [event.layoutObjects, selectedId, activeZoneFilter, isRainCrisis]);

  // 3. Camera View Preset Handler with Smooth Interpolation
  const applyCameraPreset = useCallback(
    (preset: 'iso' | 'top' | 'indoor' | 'outdoor') => {
      setViewPreset(preset);

      const newPos = new THREE.Vector3();
      const newTarget = new THREE.Vector3();

      switch (preset) {
        case 'iso':
          newPos.set(16, 18, 22);
          newTarget.set(0, 1, 0);
          break;
        case 'top':
          newPos.set(0, 42, 0.1);
          newTarget.set(0, 0, 0);
          break;
        case 'indoor':
          newPos.set(0, 12, 22);
          newTarget.set(0, 1, 8);
          break;
        case 'outdoor':
          newPos.set(0, 12, -2);
          newTarget.set(0, 1, -12);
          break;
      }

      targetCamPosRef.current = newPos;
      targetLookAtRef.current = newTarget;
      isTransitioningCamRef.current = true;
    },
    []
  );

  // Object Movement Actions
  const handleMove = (dx: number, dz: number) => {
    if (!selectedItem) return;
    const newPos: [number, number, number] = [
      Number((selectedItem.position[0] + dx).toFixed(1)),
      selectedItem.position[1],
      Number((selectedItem.position[2] + dz).toFixed(1)),
    ];

    if (!isObjectWithinBounds(newPos, selectedItem.zone, event.venue)) {
      return; // Disallow moving outside configured venue walls
    }

    const updated = event.layoutObjects.map((o) =>
      o.id === selectedItem.id ? { ...o, position: newPos } : o
    );
    onUpdateLayout(updated);
  };

  const handleRotate = () => {
    if (!selectedItem) return;
    const currentRotY = selectedItem.rotation[1] || 0;
    const newRotY = (currentRotY + Math.PI / 4) % (Math.PI * 2);
    const updated = event.layoutObjects.map((o) =>
      o.id === selectedItem.id
        ? { ...o, rotation: [o.rotation[0], newRotY, o.rotation[2]] as [number, number, number] }
        : o
    );
    onUpdateLayout(updated);
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    const updated = event.layoutObjects.filter((o) => o.id !== selectedItem.id);
    setSelectedId(null);
    onUpdateLayout(updated);
  };

  const handleAddObject = (type: LayoutObjectType, zone: 'indoor' | 'outdoor') => {
    const id = `obj_${type}_${Date.now()}`;
    const names: Record<LayoutObjectType, string> = {
      round_table: 'Banquet Table',
      buffet_station: 'Buffet Counter',
      stage: 'Modular Stage Platform',
      arch_entrance: 'Ceremonial Arch',
      lounge_set: 'VIP Lounge Suite',
      speaker_tower: 'Audio Line Array',
      seating_row: 'Row Seating Section',
      canopy_tent: 'Marquee Canopy Tent',
    };

    const capacities: Record<LayoutObjectType, number> = {
      round_table: 8,
      buffet_station: 0,
      stage: 0,
      arch_entrance: 0,
      lounge_set: 10,
      speaker_tower: 0,
      seating_row: 24,
      canopy_tent: 30,
    };

    const zPos = zone === 'indoor' ? 4 : -8;
    const newObj: LayoutObject = {
      id,
      type,
      name: `${names[type]} #${event.layoutObjects.length + 1}`,
      zone,
      position: [0, 0, zPos],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      capacity: capacities[type],
      status: 'operational',
    };

    const updated = [...event.layoutObjects, newObj];
    setSelectedId(id);
    onUpdateLayout(updated);
  };

  // Keyboard navigation for accessible 3D manipulation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedItem) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handleMove(-0.8, 0);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleMove(0.8, 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleMove(0, -0.8);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleMove(0, 0.8);
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      handleRotate();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      handleDelete();
    }
  };

  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="3D Interactive Venue Spatial Simulation. Use Arrow keys to move selected item, R to rotate, Delete to remove."
      onKeyDown={handleKeyDown}
      className="relative w-full h-[620px] bg-[#FAF8F5] rounded-xl overflow-hidden border border-[rgba(26,29,32,0.1)] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0D3B2E]/40"
    >
      {/* 3D WebGL Canvas Container */}
      {!is2DFallback ? (
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      ) : (
        /* 2D Fallback Layout View */
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-[#F3EFEA]">
          <p className="text-sm font-medium text-[#181B1E] mb-2">2D Venue Floorplan Fallback Mode</p>
          <p className="text-xs text-[#7D858D] mb-6 max-w-md text-center">
            Hardware acceleration is unavailable. Displaying interactive 2D spatial arrangement.
          </p>
          <div className="grid grid-cols-4 gap-4 max-w-3xl w-full">
            {event.layoutObjects.map((obj) => (
              <div
                key={obj.id}
                onClick={() => setSelectedId(obj.id)}
                className={`p-3 rounded-lg border text-xs cursor-pointer ${
                  selectedId === obj.id
                    ? 'border-[#0D3B2E] bg-[#EBF4F0]'
                    : 'border-[rgba(26,29,32,0.12)] bg-white'
                }`}
              >
                <div className="font-semibold text-[#181B1E]">{obj.name}</div>
                <div className="text-[#7D858D] capitalize">
                  {obj.zone} · {obj.type.replace('_', ' ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Left Minimal Status Badge (Clean typography, no pulse dots) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 bg-white/95 border border-[rgba(26,29,32,0.1)] px-3.5 py-2 rounded-lg shadow-sm text-xs">
        <span className="font-semibold text-[#181B1E]">{event.venue.name}</span>
        <span className="text-[#7D858D]">·</span>
        <span className="text-[#4A5056]">
          {event.layoutObjects.length} Objects Configured
        </span>
        <span className="text-[#7D858D]">·</span>
        <span
          className={`font-medium ${
            capacityStats.isCompliant ? 'text-[#0D3B2E]' : 'text-amber-700'
          }`}
        >
          {capacityStats.totalSeatsConfigured} / {event.expectedAttendance} Seats
        </span>
        {isRainCrisis && (
          <>
            <span className="text-[#7D858D]">·</span>
            <span className="flex items-center gap-1 font-semibold text-amber-700">
              <CloudRain className="w-3.5 h-3.5" /> Outdoor Zone Flooded
            </span>
          </>
        )}
      </div>

      {/* Top Right Quick Zone Filter */}
      <div className="absolute top-4 right-4 z-10 flex items-center bg-white/95 border border-[rgba(26,29,32,0.1)] p-1 rounded-lg shadow-sm text-xs">
        <button
          onClick={() => setActiveZoneFilter('all')}
          className={`px-2.5 py-1 rounded font-medium transition-colors ${
            activeZoneFilter === 'all'
              ? 'bg-[#0D3B2E] text-white'
              : 'text-[#4A5056] hover:text-[#181B1E]'
          }`}
        >
          All Zones
        </button>
        <button
          onClick={() => setActiveZoneFilter('indoor')}
          className={`px-2.5 py-1 rounded font-medium transition-colors ${
            activeZoneFilter === 'indoor'
              ? 'bg-[#0D3B2E] text-white'
              : 'text-[#4A5056] hover:text-[#181B1E]'
          }`}
        >
          Indoor Hall
        </button>
        <button
          onClick={() => setActiveZoneFilter('outdoor')}
          className={`px-2.5 py-1 rounded font-medium transition-colors ${
            activeZoneFilter === 'outdoor'
              ? 'bg-[#0D3B2E] text-white'
              : 'text-[#4A5056] hover:text-[#181B1E]'
          }`}
        >
          Outdoor Lawn
        </button>
      </div>

      {/* Unified Bottom Control Dock (Directive 5: <= 15% viewport, zero side cards) */}
      <div
        className={`absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[94%] max-w-[860px] bg-white border border-[rgba(26,29,32,0.12)] rounded-xl shadow-lg transition-transform duration-200 ${
          dockCollapsed ? 'translate-y-[calc(100%-36px)]' : 'translate-y-0'
        }`}
      >
        {/* Dock Header Bar with Tabs & Collapse Button */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(26,29,32,0.08)] bg-[#FAF8F5] rounded-t-xl">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('inspect')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'inspect'
                  ? 'bg-white text-[#181B1E] shadow-sm'
                  : 'text-[#4A5056] hover:text-[#181B1E]'
              }`}
            >
              Selected Object
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'add'
                  ? 'bg-white text-[#181B1E] shadow-sm'
                  : 'text-[#4A5056] hover:text-[#181B1E]'
              }`}
            >
              Add Furniture
            </button>
            <button
              onClick={() => setActiveTab('camera')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'camera'
                  ? 'bg-white text-[#181B1E] shadow-sm'
                  : 'text-[#4A5056] hover:text-[#181B1E]'
              }`}
            >
              Camera Angles
            </button>
            <button
              onClick={() => setActiveTab('capacity')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'capacity'
                  ? 'bg-white text-[#181B1E] shadow-sm'
                  : 'text-[#4A5056] hover:text-[#181B1E]'
              }`}
            >
              Capacity Metrics
            </button>
          </div>

          <button
            onClick={() => setDockCollapsed(!dockCollapsed)}
            className="flex items-center gap-1 text-xs font-medium text-[#4A5056] hover:text-[#181B1E] px-2 py-0.5 rounded transition-colors"
          >
            {dockCollapsed ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" /> Show Controls
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" /> Hide Controls
              </>
            )}
          </button>
        </div>

        {/* Dock Tab Content Panel */}
        <div className="p-3 text-xs">
          {activeTab === 'inspect' && (
            <div className="flex flex-wrap items-center justify-between gap-4">
              {selectedItem ? (
                <>
                  <div className="flex flex-col">
                    <span className="font-semibold text-[#181B1E]">{selectedItem.name}</span>
                    <span className="text-[#7D858D]">
                      Zone: {selectedItem.zone} · Position: [
                      {selectedItem.position[0].toFixed(1)}, {selectedItem.position[2].toFixed(1)}
                      ] · Capacity: {selectedItem.capacity} pax
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* D-Pad Translation Buttons */}
                    <div className="flex items-center gap-1 bg-[#F3EFEA] p-1 rounded-lg">
                      <button
                        onClick={() => handleMove(-0.8, 0)}
                        title="Move Left (-X)"
                        className="p-1 hover:bg-white rounded transition-colors"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(0, -0.8)}
                        title="Move Forward (-Z)"
                        className="p-1 hover:bg-white rounded transition-colors"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(0, 0.8)}
                        title="Move Back (+Z)"
                        className="p-1 hover:bg-white rounded transition-colors"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(0.8, 0)}
                        title="Move Right (+X)"
                        className="p-1 hover:bg-white rounded transition-colors"
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Rotate */}
                    <button
                      onClick={handleRotate}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#F3EFEA] hover:bg-[#E8E2D8] text-[#181B1E] rounded-lg transition-colors font-medium"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Rotate 45°
                    </button>

                    {/* Delete */}
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors font-medium"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-[#7D858D] py-1">
                  Click any furniture or stage in the 3D scene above to inspect, reposition, or rotate.
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-[#181B1E] mr-2">Spawn:</span>
              <button
                onClick={() => handleAddObject('round_table', 'indoor')}
                className="px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.1)] rounded-lg font-medium text-[#181B1E]"
              >
                + Indoor Banquet Table (8 pax)
              </button>
              <button
                onClick={() => handleAddObject('round_table', 'outdoor')}
                className="px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.1)] rounded-lg font-medium text-[#181B1E]"
              >
                + Lawn Banquet Table (8 pax)
              </button>
              <button
                onClick={() => handleAddObject('buffet_station', 'indoor')}
                className="px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.1)] rounded-lg font-medium text-[#181B1E]"
              >
                + Buffet Line Counter
              </button>
              <button
                onClick={() => handleAddObject('lounge_set', 'indoor')}
                className="px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.1)] rounded-lg font-medium text-[#181B1E]"
              >
                + VIP Emerald Lounge (10 pax)
              </button>
              <button
                onClick={() => handleAddObject('canopy_tent', 'outdoor')}
                className="px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#EBF4F0] border border-[rgba(26,29,32,0.1)] rounded-lg font-medium text-[#181B1E]"
              >
                + Lawn Marquee Canopy (30 pax)
              </button>
            </div>
          )}

          {activeTab === 'camera' && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#181B1E] mr-2">Presets:</span>
              <button
                onClick={() => applyCameraPreset('iso')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  viewPreset === 'iso'
                    ? 'bg-[#0D3B2E] text-white border-[#0D3B2E]'
                    : 'bg-[#FAF8F5] text-[#181B1E] border-[rgba(26,29,32,0.1)]'
                }`}
              >
                Perspective Overview
              </button>
              <button
                onClick={() => applyCameraPreset('top')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  viewPreset === 'top'
                    ? 'bg-[#0D3B2E] text-white border-[#0D3B2E]'
                    : 'bg-[#FAF8F5] text-[#181B1E] border-[rgba(26,29,32,0.1)]'
                }`}
              >
                Top-Down Floorplan
              </button>
              <button
                onClick={() => applyCameraPreset('indoor')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  viewPreset === 'indoor'
                    ? 'bg-[#0D3B2E] text-white border-[#0D3B2E]'
                    : 'bg-[#FAF8F5] text-[#181B1E] border-[rgba(26,29,32,0.1)]'
                }`}
              >
                Indoor Auditorium View
              </button>
              <button
                onClick={() => applyCameraPreset('outdoor')}
                className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  viewPreset === 'outdoor'
                    ? 'bg-[#0D3B2E] text-white border-[#0D3B2E]'
                    : 'bg-[#FAF8F5] text-[#181B1E] border-[rgba(26,29,32,0.1)]'
                }`}
              >
                Amphitheatre Stage View
              </button>
            </div>
          )}

          {activeTab === 'capacity' && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <span className="text-[#7D858D]">Indoor Seating: </span>
                  <span className="font-semibold text-[#181B1E] tabular-nums">
                    {capacityStats.indoorSeatsConfigured} / {capacityStats.indoorMaxCapacity} pax (
                    {capacityStats.indoorOccupancyRate}%)
                  </span>
                </div>
                <div>
                  <span className="text-[#7D858D]">Outdoor Seating: </span>
                  <span className="font-semibold text-[#181B1E] tabular-nums">
                    {capacityStats.outdoorSeatsConfigured} / {capacityStats.outdoorMaxCapacity} pax (
                    {capacityStats.outdoorOccupancyRate}%)
                  </span>
                </div>
                <div>
                  <span className="text-[#7D858D]">Deficit: </span>
                  <span
                    className={`font-semibold tabular-nums ${
                      capacityStats.deficit > 0 ? 'text-amber-700' : 'text-[#0D3B2E]'
                    }`}
                  >
                    {capacityStats.deficit} pax
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-[#7D858D]">
                Calculated occupancy model (verified building egress not included)
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
