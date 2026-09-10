import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  RotateCcw,
  Box,
  Wind,
  Upload,
  Eye,
  Compass,
  Zap,
  Move3d,
  MousePointer
} from 'lucide-react';
import { FlowFieldSnapshot } from '../../types/aerodynamics';

interface WindTunnelViewportProps {
  presetId: string;
  angleOfAttack: number;
  yawAngle: number;
  rollAngle?: number;
  drsOpen?: boolean;
  flowSnapshot: FlowFieldSnapshot | null;
  onCustomModelLoaded?: (object: THREE.Object3D) => void;
  onRotationChange?: (aoa: number, yaw: number, roll: number) => void;
  onToggleDrs?: () => void;
  darkMode: boolean;
}

interface StreamlineSeed {
  y0: number;
  z0: number;
  isCenter: boolean;
}

export const WindTunnelViewport: React.FC<WindTunnelViewportProps> = ({
  presetId,
  angleOfAttack,
  yawAngle,
  rollAngle = 0,
  drsOpen = false,
  flowSnapshot,
  onCustomModelLoaded,
  onRotationChange,
  onToggleDrs,
  darkMode,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const stingRef = useRef<THREE.Group | null>(null);
  const tunnelGroupRef = useRef<THREE.Group | null>(null);
  const gizmoGroupRef = useRef<THREE.Group | null>(null);
  const drsFlapRef = useRef<THREE.Group | null>(null);
  const customBBoxRef = useRef<{ min: THREE.Vector3; max: THREE.Vector3 } | null>(null);

  // References to keep props up-to-date inside the animation loop (prevents stale closures)
  const flowSnapshotRef = useRef<FlowFieldSnapshot | null>(flowSnapshot);
  useEffect(() => {
    flowSnapshotRef.current = flowSnapshot;
  }, [flowSnapshot]);

  const aoaRef = useRef<number>(angleOfAttack);
  useEffect(() => {
    aoaRef.current = angleOfAttack;
  }, [angleOfAttack]);

  const yawRef = useRef<number>(yawAngle);
  useEffect(() => {
    yawRef.current = yawAngle;
  }, [yawAngle]);

  const rollRef = useRef<number>(rollAngle);
  useEffect(() => {
    rollRef.current = rollAngle;
  }, [rollAngle]);

  const drsOpenRef = useRef<boolean>(drsOpen);
  useEffect(() => {
    drsOpenRef.current = drsOpen;
  }, [drsOpen]);

  const presetIdRef = useRef<string>(presetId);
  useEffect(() => {
    presetIdRef.current = presetId;
  }, [presetId]);

  // Streamline line meshes & pulse particle references
  const streamlineLinesRef = useRef<THREE.LineSegments | null>(null);
  const smokePulsesRef = useRef<THREE.Points | null>(null);
  const rakeGroupRef = useRef<THREE.Group | null>(null);

  // Streamline trajectory cache for animated smoke pulses
  const streamlinePathsRef = useRef<Float32Array[]>([]);
  const pulsePhasesRef = useRef<Float32Array | null>(null);

  const [showStreamlines, setShowStreamlines] = useState(true);
  const [showTunnelWalls, setShowTunnelWalls] = useState(true);
  const [rakeMode, setRakeMode] = useState<'3d' | 'center'>('3d');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [interactionMode, setInteractionMode] = useState<'camera' | 'model'>('camera');

  const TUNNEL_LENGTH = 14.0;
  const TUNNEL_WIDTH = 6.0;
  const TUNNEL_HEIGHT = 5.0;
  const MODEL_X_OFFSET = -0.70; // 45% into the tunnel, matching CFD obstacle center
  const SEGMENTS_PER_LINE = 110;
  const PULSES_PER_LINE = 3;

  // Streamline seed points (emitted from authentic smoke wand rake at tunnel inlet)
  const streamlineSeeds = useMemo<StreamlineSeed[]>(() => {
    const seeds: StreamlineSeed[] = [];
    // Dense center sheet for profile analysis (airfoil camber, car roof, DRS flap)
    const centerProfileYs = [-1.4, -1.15, -0.9, -0.7, -0.5, -0.35, -0.2, -0.1, 0.0, 0.1, 0.2, 0.35, 0.5, 0.7, 0.9, 1.15, 1.4];
    centerProfileYs.forEach(y => {
      seeds.push({ y0: y, z0: 0.0, isCenter: true });
    });

    // 3D volume grid lines spanning across span/lateral width
    const lateralZs = [-1.5, -1.0, -0.5, 0.5, 1.0, 1.5];
    const lateralYs = [-1.2, -0.7, -0.3, 0.0, 0.3, 0.7, 1.2];
    lateralZs.forEach(z => {
      lateralYs.forEach(y => {
        seeds.push({ y0: y, z0: z, isCenter: false });
      });
    });

    return seeds;
  }, []);

  const totalLines = streamlineSeeds.length;
  const totalPulseCount = totalLines * PULSES_PER_LINE;

  // Drag-to-Rotate Model Logic
  const isDraggingModelRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; aoa: number; yaw: number; roll: number }>({
    x: 0,
    y: 0,
    aoa: 0,
    yaw: 0,
    roll: 0,
  });

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (interactionMode === 'model' || e.altKey) {
      isDraggingModelRef.current = true;
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        aoa: aoaRef.current,
        yaw: yawRef.current,
        roll: rollRef.current,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingModelRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (e.shiftKey) {
      // Shift-drag rolls model around X axis
      const newRoll = Math.round(dragStartRef.current.roll + dx * 0.5);
      onRotationChange?.(dragStartRef.current.aoa, dragStartRef.current.yaw, newRoll);
    } else {
      // Drag X = Yaw, Drag Y = AoA (Pitch)
      const newYaw = Math.round(dragStartRef.current.yaw + dx * 0.5);
      const newAoA = Math.max(-90, Math.min(90, Math.round(dragStartRef.current.aoa - dy * 0.5)));
      onRotationChange?.(newAoA, newYaw, dragStartRef.current.roll);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingModelRef.current) {
      isDraggingModelRef.current = false;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Toggle Interaction Mode between Camera Orbit and Rotate Model
  const toggleInteractionMode = () => {
    const nextMode = interactionMode === 'camera' ? 'model' : 'camera';
    setInteractionMode(nextMode);
    if (controlsRef.current) {
      controlsRef.current.enabled = nextMode === 'camera';
    }
    if (gizmoGroupRef.current) {
      gizmoGroupRef.current.visible = nextMode === 'model';
    }
  };

  // 3D Scene Initialization
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 520;

    // Three.js Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(darkMode ? 0x090d16 : 0xf8fafc);
    sceneRef.current = scene;

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(-6.8, 3.8, 9.2);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(MODEL_X_OFFSET, 0, 0);
    controls.minDistance = 3.5;
    controls.maxDistance = 22.0;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.enabled = interactionMode === 'camera';
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, darkMode ? 0.7 : 0.9);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, darkMode ? 1.4 : 1.2);
    dirLight1.position.set(-8, 12, 8);
    dirLight1.castShadow = true;
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x38bdf8, 0.6);
    dirLight2.position.set(8, -4, -6);
    scene.add(dirLight2);

    // Wind Tunnel Glass Enclosure
    const tunnelGroup = new THREE.Group();
    buildWindTunnel(tunnelGroup, darkMode);
    scene.add(tunnelGroup);
    tunnelGroupRef.current = tunnelGroup;

    // Smoke Wand Rake at Inlet
    const rakeGroup = new THREE.Group();
    buildSmokeRake(rakeGroup, darkMode);
    scene.add(rakeGroup);
    rakeGroupRef.current = rakeGroup;

    // Sting Mounting System
    const stingGroup = new THREE.Group();
    buildStingMount(stingGroup, darkMode);
    scene.add(stingGroup);
    stingRef.current = stingGroup;

    // 3D Rotation Gimbal Ring Gizmo
    const gizmoGroup = new THREE.Group();
    gizmoGroup.position.set(MODEL_X_OFFSET, 0, 0);
    buildRotationGizmo(gizmoGroup);
    gizmoGroup.visible = interactionMode === 'model';
    scene.add(gizmoGroup);
    gizmoGroupRef.current = gizmoGroup;

    // Model Container
    const modelGroup = new THREE.Group();
    modelGroup.position.set(MODEL_X_OFFSET, 0, 0);
    const initialMesh = createPresetMesh(presetIdRef.current, darkMode, drsOpenRef.current);
    modelGroup.add(initialMesh);
    scene.add(modelGroup);
    modelGroupRef.current = modelGroup;

    // Continuous Streamlines & Smoke Pulses
    initStreamlineMeshes(scene, darkMode);

    // Animation Loop
    let animationFrameId: number;
    let lastTime = performance.now();
    let simTime = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      simTime += dt;

      if (controlsRef.current && controlsRef.current.enabled) {
        controlsRef.current.update();
      }

      // Smooth DRS Flap Articulation
      if (drsFlapRef.current) {
        const targetRot = drsOpenRef.current ? 0.05 : -0.52;
        drsFlapRef.current.rotation.z += (targetRot - drsFlapRef.current.rotation.z) * 0.25;
      }

      // Update Streamlines and Smoke Pulses with 3D Collision Detection
      updateStreamlines(dt, simTime);

      renderer.render(scene, camera);
    };
    animationFrameId = requestAnimationFrame(animate);

    // Handle Resize
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight || 520;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
    };
  }, []);

  // Update Scene Background on Theme Change
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(darkMode ? 0x090d16 : 0xf8fafc);
    }
  }, [darkMode]);

  // Update Model Geometry when presetId or theme changes
  useEffect(() => {
    if (!modelGroupRef.current) return;
    const group = modelGroupRef.current;

    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    }

    if (presetId === 'custom') return;

    const mesh = createPresetMesh(presetId, darkMode, drsOpen);
    group.add(mesh);
  }, [presetId, darkMode]);

  // Articulate DRS Flap immediately when drsOpen changes
  useEffect(() => {
    if (drsFlapRef.current) {
      drsFlapRef.current.rotation.z = drsOpen ? 0.05 : -0.52;
    }
  }, [drsOpen]);

  // Rotate model, sting, and gizmo with AoA, Yaw, and Roll
  useEffect(() => {
    const radAoA = (-angleOfAttack * Math.PI) / 180; // Pitch around Z
    const radYaw = (yawAngle * Math.PI) / 180;      // Yaw around Y
    const radRoll = (rollAngle * Math.PI) / 180;    // Roll around X

    if (modelGroupRef.current) {
      modelGroupRef.current.rotation.set(radRoll, radYaw, radAoA);
    }
    if (stingRef.current) {
      stingRef.current.rotation.set(radRoll * 0.3, radYaw, radAoA * 0.4);
    }
    if (gizmoGroupRef.current) {
      gizmoGroupRef.current.rotation.set(radRoll, radYaw, radAoA);
    }
  }, [angleOfAttack, yawAngle, rollAngle]);

  // Toggle Tunnel Walls visibility
  useEffect(() => {
    if (tunnelGroupRef.current) {
      tunnelGroupRef.current.visible = showTunnelWalls;
    }
  }, [showTunnelWalls]);

  // Toggle Streamlines visibility
  useEffect(() => {
    if (streamlineLinesRef.current) {
      streamlineLinesRef.current.visible = showStreamlines;
    }
    if (smokePulsesRef.current) {
      smokePulsesRef.current.visible = showStreamlines;
    }
    if (rakeGroupRef.current) {
      rakeGroupRef.current.visible = showStreamlines;
    }
  }, [showStreamlines]);

  // Build Tunnel Enclosure Structure
  const buildWindTunnel = (group: THREE.Group, isDark: boolean) => {
    const wallMat = new THREE.MeshPhysicalMaterial({
      color: isDark ? 0x38bdf8 : 0x0284c7,
      transparent: true,
      opacity: isDark ? 0.08 : 0.05,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      ior: 1.5,
      side: THREE.DoubleSide,
    });

    const tunnelGeo = new THREE.BoxGeometry(TUNNEL_LENGTH, TUNNEL_HEIGHT, TUNNEL_WIDTH);
    const tunnelMesh = new THREE.Mesh(tunnelGeo, wallMat);
    group.add(tunnelMesh);

    const edges = new THREE.EdgesGeometry(tunnelGeo);
    const lineMat = new THREE.LineBasicMaterial({
      color: isDark ? 0x334155 : 0x94a3b8,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.7,
    });
    const wireframe = new THREE.LineSegments(edges, lineMat);
    group.add(wireframe);

    const ringMat = new THREE.MeshBasicMaterial({
      color: isDark ? 0x1e293b : 0xcfd4dc,
      wireframe: true,
    });
    const inletRing = new THREE.RingGeometry(1.8, 2.4, 24);
    inletRing.rotateY(Math.PI / 2);
    const inletMesh = new THREE.Mesh(inletRing, ringMat);
    inletMesh.position.set(-TUNNEL_LENGTH / 2, 0, 0);
    group.add(inletMesh);

    const outletRing = new THREE.RingGeometry(1.8, 2.6, 24);
    outletRing.rotateY(Math.PI / 2);
    const outletMesh = new THREE.Mesh(outletRing, ringMat);
    outletMesh.position.set(TUNNEL_LENGTH / 2, 0, 0);
    group.add(outletMesh);

    const arrowHelper = new THREE.ArrowHelper(
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-TUNNEL_LENGTH / 2 + 1.2, -TUNNEL_HEIGHT / 2 + 0.35, 0),
      1.5,
      isDark ? 0x38bdf8 : 0x2563eb,
      0.3,
      0.2
    );
    group.add(arrowHelper);
  };

  // Build Physical Smoke Wand Rake at Inlet
  const buildSmokeRake = (group: THREE.Group, isDark: boolean) => {
    const barMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x475569 : 0x64748b,
      metalness: 0.85,
      roughness: 0.25,
    });

    const xInlet = -TUNNEL_LENGTH / 2 + 0.25;

    const mastGeo = new THREE.CylinderGeometry(0.045, 0.045, TUNNEL_HEIGHT * 0.84, 16);
    const mast = new THREE.Mesh(mastGeo, barMat);
    mast.position.set(xInlet, 0, 0);
    group.add(mast);

    const zBars = [-1.55, -0.95, -0.45, 0.45, 0.95, 1.55];
    zBars.forEach(z => {
      const armGeo = new THREE.CylinderGeometry(0.025, 0.025, TUNNEL_HEIGHT * 0.65, 12);
      const arm = new THREE.Mesh(armGeo, barMat);
      arm.position.set(xInlet, 0, z);
      group.add(arm);
    });

    const braceGeo = new THREE.CylinderGeometry(0.03, 0.03, TUNNEL_WIDTH * 0.6, 12);
    braceGeo.rotateX(Math.PI / 2);
    const brace = new THREE.Mesh(braceGeo, barMat);
    brace.position.set(xInlet, 0, 0);
    group.add(brace);

    const nozzleMat = new THREE.MeshBasicMaterial({ color: isDark ? 0x38bdf8 : 0x0284c7 });
    streamlineSeeds.forEach(s => {
      const coneGeo = new THREE.ConeGeometry(0.03, 0.1, 8);
      coneGeo.rotateZ(-Math.PI / 2);
      const cone = new THREE.Mesh(coneGeo, nozzleMat);
      cone.position.set(xInlet + 0.05, s.y0, s.z0);
      group.add(cone);
    });
  };

  // Build Mount / Sting
  const buildStingMount = (group: THREE.Group, isDark: boolean) => {
    const mat = new THREE.MeshStandardMaterial({
      color: isDark ? 0x475569 : 0x64748b,
      metalness: 0.8,
      roughness: 0.3,
    });

    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 16);
    armGeo.rotateZ(Math.PI / 2);
    const arm = new THREE.Mesh(armGeo, mat);
    arm.position.set(1.25, 0, 0);
    group.add(arm);

    const baseGeo = new THREE.CylinderGeometry(0.12, 0.16, 2.5, 16);
    const base = new THREE.Mesh(baseGeo, mat);
    base.position.set(2.4, -1.25, 0);
    group.add(base);
  };

  // Build 3D Rotation Gizmo
  const buildRotationGizmo = (group: THREE.Group) => {
    // Pitch Ring (Red, in YZ plane)
    const pitchRingGeo = new THREE.TorusGeometry(1.65, 0.016, 16, 64);
    pitchRingGeo.rotateY(Math.PI / 2);
    const pitchRingMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.75 });
    const pitchRing = new THREE.Mesh(pitchRingGeo, pitchRingMat);
    group.add(pitchRing);

    // Yaw Ring (Green, in XZ plane)
    const yawRingGeo = new THREE.TorusGeometry(1.80, 0.016, 16, 64);
    yawRingGeo.rotateX(Math.PI / 2);
    const yawRingMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.75 });
    const yawRing = new THREE.Mesh(yawRingGeo, yawRingMat);
    group.add(yawRing);

    // Roll Ring (Blue, in XY plane)
    const rollRingGeo = new THREE.TorusGeometry(1.95, 0.016, 16, 64);
    const rollRingMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.75 });
    const rollRing = new THREE.Mesh(rollRingGeo, rollRingMat);
    group.add(rollRing);
  };

  // Create Preset 3D Geometries
  const createPresetMesh = (preset: string, isDark: boolean, isDrsOpen = false): THREE.Object3D => {
    const mainMat = new THREE.MeshStandardMaterial({
      color: isDark ? 0xe2e8f0 : 0x334155,
      metalness: 0.4,
      roughness: 0.35,
    });

    switch (preset) {
      case 'sphere': {
        const geo = new THREE.SphereGeometry(1.0, 48, 36);
        return new THREE.Mesh(geo, mainMat);
      }

      case 'golf-ball': {
        // Dimpled Golf Ball
        const ballGroup = new THREE.Group();
        const ballMat = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.2,
          metalness: 0.1,
        });
        const sphereGeo = new THREE.SphereGeometry(0.98, 48, 36);
        const coreBall = new THREE.Mesh(sphereGeo, ballMat);
        ballGroup.add(coreBall);

        // Procedural dimple craters across surface
        const dimpleMat = new THREE.MeshStandardMaterial({
          color: 0xcbd5e1,
          roughness: 0.5,
        });
        const dimpleGeo = new THREE.SphereGeometry(0.085, 12, 8);
        dimpleGeo.scale(1, 0.4, 1);

        for (let lat = -70; lat <= 70; lat += 20) {
          const latRad = (lat * Math.PI) / 180;
          const rRing = Math.cos(latRad) * 0.98;
          const y = Math.sin(latRad) * 0.98;
          const count = Math.max(6, Math.floor(Math.cos(latRad) * 26));

          for (let i = 0; i < count; i++) {
            const lonRad = (i / count) * Math.PI * 2;
            const x = Math.cos(lonRad) * rRing;
            const z = Math.sin(lonRad) * rRing;
            const dimple = new THREE.Mesh(dimpleGeo, dimpleMat);
            dimple.position.set(x, y, z);
            dimple.lookAt(0, 0, 0);
            ballGroup.add(dimple);
          }
        }
        return ballGroup;
      }

      case 'flat-plate': {
        const geo = new THREE.BoxGeometry(0.08, 2.4, 1.8);
        return new THREE.Mesh(geo, mainMat);
      }

      case 'cylinder': {
        const geo = new THREE.CylinderGeometry(0.8, 0.8, 2.6, 36);
        return new THREE.Mesh(geo, mainMat);
      }

      case 'naca0012':
      case 'naca4412': {
        const shape = new THREE.Shape();
        const chord = 3.0;
        const pts: THREE.Vector2[] = [];
        const isCambered = preset === 'naca4412';

        for (let i = 0; i <= 60; i++) {
          const xNorm = i / 60;
          const x = (xNorm - 0.5) * chord;
          const yt =
            5 *
            0.12 *
            chord *
            (0.2969 * Math.sqrt(xNorm) -
              0.126 * xNorm -
              0.3516 * xNorm * xNorm +
              0.2843 * Math.pow(xNorm, 3) -
              0.1015 * Math.pow(xNorm, 4));

          let camber = 0;
          if (isCambered) {
            const m = 0.04;
            const p = 0.4;
            camber = xNorm < p ? (m / (p * p)) * (2 * p * xNorm - xNorm * xNorm) * chord : (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * xNorm - xNorm * xNorm) * chord;
          }

          pts.push(new THREE.Vector2(x, camber + yt));
        }

        for (let i = 60; i >= 0; i--) {
          const xNorm = i / 60;
          const x = (xNorm - 0.5) * chord;
          const yt =
            5 *
            0.12 *
            chord *
            (0.2969 * Math.sqrt(xNorm) -
              0.126 * xNorm -
              0.3516 * xNorm * xNorm +
              0.2843 * Math.pow(xNorm, 3) -
              0.1015 * Math.pow(xNorm, 4));

          let camber = 0;
          if (isCambered) {
            const m = 0.04;
            const p = 0.4;
            camber = xNorm < p ? (m / (p * p)) * (2 * p * xNorm - xNorm * xNorm) * chord : (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * xNorm - xNorm * xNorm) * chord;
          }

          pts.push(new THREE.Vector2(x, camber - yt));
        }

        shape.setFromPoints(pts);

        const extrudeSettings = {
          depth: 2.2,
          bevelEnabled: true,
          bevelSegments: 2,
          steps: 1,
          bevelSize: 0.02,
          bevelThickness: 0.02,
        };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.center();
        const mesh = new THREE.Mesh(geo, mainMat);
        mesh.rotation.y = Math.PI / 2;
        return mesh;
      }

      case 'f1-rear-wing': {
        // High-Downforce Formula 1 Multi-Element Rear Wing with Articulated DRS Flap
        const wingGroup = new THREE.Group();
        const carbonMat = new THREE.MeshStandardMaterial({
          color: isDark ? 0x1e293b : 0x0f172a,
          metalness: 0.85,
          roughness: 0.25,
        });

        // 1. Endplates (Left & Right with aerodynamic strakes)
        const endplateGeo = new THREE.BoxGeometry(1.9, 1.4, 0.04);
        const leftEndplate = new THREE.Mesh(endplateGeo, carbonMat);
        leftEndplate.position.set(0, 0.2, 1.38);
        wingGroup.add(leftEndplate);

        const rightEndplate = new THREE.Mesh(endplateGeo, carbonMat);
        rightEndplate.position.set(0, 0.2, -1.38);
        wingGroup.add(rightEndplate);

        // Endplate Strakes / Cascade Louvres
        const strakeGeo = new THREE.BoxGeometry(1.3, 0.03, 0.08);
        [-0.15, 0.05, 0.25].forEach(offsetY => {
          const sL = new THREE.Mesh(strakeGeo, carbonMat);
          sL.position.set(0.1, 0.4 + offsetY, 1.4);
          wingGroup.add(sL);

          const sR = new THREE.Mesh(strakeGeo, carbonMat);
          sR.position.set(0.1, 0.4 + offsetY, -1.4);
          wingGroup.add(sR);
        });

        // 2. Mainplane (Cambered Wing Element)
        const mainSpan = 2.72;
        const mainChord = 1.1;
        const mainShape = new THREE.Shape();
        mainShape.moveTo(-mainChord * 0.5, 0);
        mainShape.quadraticCurveTo(-mainChord * 0.2, 0.24, mainChord * 0.5, -0.16);
        mainShape.lineTo(mainChord * 0.5, -0.10);
        mainShape.quadraticCurveTo(-mainChord * 0.2, 0.14, -mainChord * 0.5, 0);

        const extrudeMain = new THREE.ExtrudeGeometry(mainShape, { depth: mainSpan, bevelEnabled: false });
        extrudeMain.center();
        const mainMesh = new THREE.Mesh(extrudeMain, carbonMat);
        mainMesh.position.set(-0.2, -0.08, 0);
        wingGroup.add(mainMesh);

        // 3. Swan-neck mounting pylons
        const pylonMat = new THREE.MeshStandardMaterial({
          color: isDark ? 0x475569 : 0x334155,
          metalness: 0.9,
          roughness: 0.2,
        });
        const pylonGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.25, 16);
        pylonGeo.rotateZ(0.38);
        const pylonL = new THREE.Mesh(pylonGeo, pylonMat);
        pylonL.position.set(-0.1, -0.32, 0.35);
        wingGroup.add(pylonL);

        const pylonR = new THREE.Mesh(pylonGeo, pylonMat);
        pylonR.position.set(-0.1, -0.32, -0.35);
        wingGroup.add(pylonR);

        // 4. Center DRS Hydraulic Actuator Bullet
        const actPodGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.7, 16);
        actPodGeo.rotateZ(Math.PI / 2);
        const actPod = new THREE.Mesh(actPodGeo, pylonMat);
        actPod.position.set(0.18, 0.44, 0);
        wingGroup.add(actPod);

        // 5. ARTICULATED DRS UPPER FLAP
        const flapGroup = new THREE.Group();
        flapGroup.position.set(0.15, 0.30, 0); // Hinge pivot point

        const flapChord = 0.72;
        const flapShape = new THREE.Shape();
        flapShape.moveTo(0, 0);
        flapShape.quadraticCurveTo(flapChord * 0.35, 0.12, flapChord, 0.03);
        flapShape.lineTo(flapChord, -0.02);
        flapShape.quadraticCurveTo(flapChord * 0.35, 0.06, 0, 0);

        const flapGeo = new THREE.ExtrudeGeometry(flapShape, { depth: mainSpan - 0.04, bevelEnabled: false });
        flapGeo.center();
        const flapMesh = new THREE.Mesh(flapGeo, carbonMat);
        flapMesh.position.set(flapChord * 0.45, 0, 0);
        flapGroup.add(flapMesh);

        // Initial angle based on isDrsOpen
        flapGroup.rotation.z = isDrsOpen ? 0.05 : -0.52;
        drsFlapRef.current = flapGroup;

        wingGroup.add(flapGroup);

        return wingGroup;
      }

      case 'jet-airliner': {
        // Transonic Commercial Jet Airliner
        const jetGroup = new THREE.Group();
        const airframeMat = new THREE.MeshStandardMaterial({
          color: 0xf1f5f9,
          metalness: 0.4,
          roughness: 0.25,
        });
        const glassMat = new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.1,
          metalness: 0.9,
        });

        // Fuselage
        const fuseGeo = new THREE.CylinderGeometry(0.48, 0.45, 4.4, 24);
        fuseGeo.rotateZ(Math.PI / 2);
        const fuselage = new THREE.Mesh(fuseGeo, airframeMat);
        jetGroup.add(fuselage);

        // Radome Nose Cone
        const noseGeo = new THREE.ConeGeometry(0.48, 0.8, 24);
        noseGeo.rotateZ(Math.PI / 2);
        const nose = new THREE.Mesh(noseGeo, airframeMat);
        nose.position.set(-2.6, 0, 0);
        jetGroup.add(nose);

        // Cockpit Glass Visor
        const visorGeo = new THREE.BoxGeometry(0.5, 0.22, 0.55);
        const visor = new THREE.Mesh(visorGeo, glassMat);
        visor.position.set(-2.0, 0.26, 0);
        jetGroup.add(visor);

        // Swept Wings with Winglets
        const wingGeo = new THREE.BoxGeometry(1.6, 0.12, 1.8);
        const leftWing = new THREE.Mesh(wingGeo, airframeMat);
        leftWing.position.set(0.1, -0.05, 1.25);
        leftWing.rotation.y = -0.32;
        leftWing.rotation.x = 0.08;
        jetGroup.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeo, airframeMat);
        rightWing.position.set(0.1, -0.05, -1.25);
        rightWing.rotation.y = 0.32;
        rightWing.rotation.x = -0.08;
        jetGroup.add(rightWing);

        // Winglets
        const wingletGeo = new THREE.BoxGeometry(0.3, 0.45, 0.05);
        const wingletL = new THREE.Mesh(wingletGeo, airframeMat);
        wingletL.position.set(0.3, 0.18, 2.05);
        jetGroup.add(wingletL);

        const wingletR = new THREE.Mesh(wingletGeo, airframeMat);
        wingletR.position.set(0.3, 0.18, -2.05);
        jetGroup.add(wingletR);

        // Twin High-Bypass Turbofans (Underslung Nacelles)
        const nacelleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.3 });
        [-0.95, 0.95].forEach(z => {
          const nacelleGeo = new THREE.CylinderGeometry(0.24, 0.22, 1.0, 16);
          nacelleGeo.rotateZ(Math.PI / 2);
          const nacelle = new THREE.Mesh(nacelleGeo, nacelleMat);
          nacelle.position.set(-0.15, -0.45, z);
          jetGroup.add(nacelle);

          const fanGeo = new THREE.ConeGeometry(0.08, 0.2, 12);
          fanGeo.rotateZ(Math.PI / 2);
          const fan = new THREE.Mesh(fanGeo, glassMat);
          fan.position.set(-0.65, -0.45, z);
          jetGroup.add(fan);
        });

        // Vertical Tail Fin
        const finGeo = new THREE.BoxGeometry(0.9, 1.2, 0.08);
        const fin = new THREE.Mesh(finGeo, airframeMat);
        fin.position.set(1.7, 0.75, 0);
        fin.rotation.z = -0.3;
        jetGroup.add(fin);

        // Horizontal Stabilizers
        const stabGeo = new THREE.BoxGeometry(0.8, 0.08, 1.4);
        const stab = new THREE.Mesh(stabGeo, airframeMat);
        stab.position.set(1.9, 0.15, 0);
        jetGroup.add(stab);

        return jetGroup;
      }

      case 'supersonic-jet': {
        // Mach 2+ Supersonic Delta Wing Fighter Jet
        const jetGroup = new THREE.Group();
        const metalMat = new THREE.MeshStandardMaterial({
          color: isDark ? 0x64748b : 0x475569,
          metalness: 0.85,
          roughness: 0.28,
        });
        const canopyMat = new THREE.MeshStandardMaterial({
          color: 0xd97706,
          metalness: 0.9,
          roughness: 0.1,
          transparent: true,
          opacity: 0.75,
        });

        // Slender Fuselage with Needle Radome
        const bodyGeo = new THREE.ConeGeometry(0.38, 4.6, 20);
        bodyGeo.rotateZ(-Math.PI / 2);
        const body = new THREE.Mesh(bodyGeo, metalMat);
        body.position.set(-0.2, 0, 0);
        jetGroup.add(body);

        const pitotTubeGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8);
        pitotTubeGeo.rotateZ(Math.PI / 2);
        const pitot = new THREE.Mesh(pitotTubeGeo, metalMat);
        pitot.position.set(-2.7, 0, 0);
        jetGroup.add(pitot);

        // Cockpit Canopy
        const canopyGeo = new THREE.SphereGeometry(0.24, 16, 12);
        canopyGeo.scale(2.5, 0.9, 0.8);
        const canopy = new THREE.Mesh(canopyGeo, canopyMat);
        canopy.position.set(-1.1, 0.22, 0);
        jetGroup.add(canopy);

        // Razor-Thin Ogival Cropped Delta Wings
        const deltaShape = new THREE.Shape();
        deltaShape.moveTo(-1.2, 0);
        deltaShape.lineTo(1.4, 1.6);
        deltaShape.lineTo(1.6, 1.4);
        deltaShape.lineTo(1.6, -1.4);
        deltaShape.lineTo(1.4, -1.6);
        deltaShape.lineTo(-1.2, 0);

        const deltaGeo = new THREE.ExtrudeGeometry(deltaShape, { depth: 0.05, bevelEnabled: false });
        deltaGeo.rotateX(Math.PI / 2);
        const deltaWing = new THREE.Mesh(deltaGeo, metalMat);
        deltaWing.position.set(0, 0, 0.025);
        jetGroup.add(deltaWing);

        // Twin Canted Vertical Tail Fins
        const finGeo = new THREE.BoxGeometry(0.7, 0.85, 0.04);
        const finL = new THREE.Mesh(finGeo, metalMat);
        finL.position.set(1.2, 0.45, 0.35);
        finL.rotation.z = -0.25;
        finL.rotation.x = -0.22;
        jetGroup.add(finL);

        const finR = new THREE.Mesh(finGeo, metalMat);
        finR.position.set(1.2, 0.45, -0.35);
        finR.rotation.z = -0.25;
        finR.rotation.x = 0.22;
        jetGroup.add(finR);

        // Afterburner Nozzles
        const burnerMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.4 });
        [-0.18, 0.18].forEach(z => {
          const nozzleGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.4, 16);
          nozzleGeo.rotateZ(Math.PI / 2);
          const nozzle = new THREE.Mesh(nozzleGeo, burnerMat);
          nozzle.position.set(1.85, 0, z);
          jetGroup.add(nozzle);
        });

        return jetGroup;
      }

      case 'propeller-blade': {
        // High-Efficiency Twisted Propeller / Wind Turbine Blade
        const propGroup = new THREE.Group();
        const bladeMat = new THREE.MeshStandardMaterial({
          color: isDark ? 0x0284c7 : 0x0369a1,
          metalness: 0.6,
          roughness: 0.3,
        });

        // Center Hub Spinner
        const spinnerGeo = new THREE.ConeGeometry(0.4, 0.9, 24);
        spinnerGeo.rotateZ(-Math.PI / 2);
        const spinner = new THREE.Mesh(spinnerGeo, bladeMat);
        propGroup.add(spinner);

        // 3 Aerodynamic Twisted Blades
        for (let b = 0; b < 3; b++) {
          const angle = (b / 3) * Math.PI * 2;
          const bladeSub = new THREE.Group();
          bladeSub.rotation.x = angle;

          const bladeGeo = new THREE.BoxGeometry(0.35, 1.8, 0.06);
          const blade = new THREE.Mesh(bladeGeo, bladeMat);
          blade.position.set(0, 1.1, 0);
          blade.rotation.y = 0.25; // pitch twist
          bladeSub.add(blade);
          propGroup.add(bladeSub);
        }

        return propGroup;
      }

      case 'car-body': {
        const carGroup = new THREE.Group();
        const chassisGeo = new THREE.BoxGeometry(3.6, 0.7, 1.6);
        const chassis = new THREE.Mesh(chassisGeo, mainMat);
        chassis.position.y = -0.3;
        carGroup.add(chassis);

        const cabinGeo = new THREE.BoxGeometry(2.0, 0.7, 1.4);
        const cabin = new THREE.Mesh(cabinGeo, mainMat);
        cabin.position.set(-0.2, 0.35, 0);
        carGroup.add(cabin);

        const hoodSlopeGeo = new THREE.CylinderGeometry(0.3, 0.3, 1.5, 16);
        hoodSlopeGeo.rotateX(Math.PI / 2);
        const hoodNose = new THREE.Mesh(hoodSlopeGeo, mainMat);
        hoodNose.position.set(-1.8, -0.2, 0);
        carGroup.add(hoodNose);

        return carGroup;
      }

      case 'finite-wing':
      case 'wing-3d': {
        const wingGroup = new THREE.Group();
        const rootChord = 2.4;
        const semiSpan = 1.6;

        const wingGeo = new THREE.BoxGeometry(rootChord, 0.22, semiSpan);
        const leftWing = new THREE.Mesh(wingGeo, mainMat);
        leftWing.position.set(-0.2, 0, semiSpan / 2);
        leftWing.rotation.y = -0.15;
        wingGroup.add(leftWing);

        const rightWing = new THREE.Mesh(wingGeo, mainMat);
        rightWing.position.set(-0.2, 0, -semiSpan / 2);
        rightWing.rotation.y = 0.15;
        wingGroup.add(rightWing);

        const fuseGeo = new THREE.CylinderGeometry(0.35, 0.25, 3.8, 24);
        fuseGeo.rotateZ(Math.PI / 2);
        const fuselage = new THREE.Mesh(fuseGeo, mainMat);
        wingGroup.add(fuselage);

        return wingGroup;
      }

      default: {
        const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        return new THREE.Mesh(geo, mainMat);
      }
    }
  };

  // Initialize Continuous Streamline Line Meshes & Smoke Pulses
  const initStreamlineMeshes = (scene: THREE.Scene, isDark: boolean) => {
    const totalSegments = totalLines * SEGMENTS_PER_LINE;
    const vertexCount = totalSegments * 2;

    const lineGeo = new THREE.BufferGeometry();
    const linePositions = new Float32Array(vertexCount * 3);
    const lineColors = new Float32Array(vertexCount * 3);

    const xStart = -TUNNEL_LENGTH / 2 + 0.35;
    const dx = (TUNNEL_LENGTH - 0.7) / SEGMENTS_PER_LINE;

    streamlinePathsRef.current = [];

    let vIdx = 0;
    streamlineSeeds.forEach((seed, lineIdx) => {
      const pathCache = new Float32Array((SEGMENTS_PER_LINE + 1) * 3);
      pathCache[0] = xStart;
      pathCache[1] = seed.y0;
      pathCache[2] = seed.z0;

      let curX = xStart;
      let curY = seed.y0;
      let curZ = seed.z0;

      for (let s = 0; s < SEGMENTS_PER_LINE; s++) {
        const nextX = curX + dx;
        const nextY = curY;
        const nextZ = curZ;

        pathCache[(s + 1) * 3 + 0] = nextX;
        pathCache[(s + 1) * 3 + 1] = nextY;
        pathCache[(s + 1) * 3 + 2] = nextZ;

        linePositions[vIdx * 3 + 0] = curX;
        linePositions[vIdx * 3 + 1] = curY;
        linePositions[vIdx * 3 + 2] = curZ;

        linePositions[(vIdx + 1) * 3 + 0] = nextX;
        linePositions[(vIdx + 1) * 3 + 1] = nextY;
        linePositions[(vIdx + 1) * 3 + 2] = nextZ;

        for (let k = 0; k < 2; k++) {
          lineColors[(vIdx + k) * 3 + 0] = 0.22;
          lineColors[(vIdx + k) * 3 + 1] = 0.78;
          lineColors[(vIdx + k) * 3 + 2] = 0.98;
        }

        curX = nextX;
        vIdx += 2;
      }

      streamlinePathsRef.current[lineIdx] = pathCache;
    });

    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeo.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.88 : 0.75,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const linesMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(linesMesh);
    streamlineLinesRef.current = linesMesh;

    // Animated Smoke Pulse Beads
    const pulseGeo = new THREE.BufferGeometry();
    const pulsePositions = new Float32Array(totalPulseCount * 3);
    const pulseColors = new Float32Array(totalPulseCount * 3);
    const pulsePhases = new Float32Array(totalPulseCount);

    for (let i = 0; i < totalPulseCount; i++) {
      pulsePositions[i * 3 + 0] = xStart;
      pulsePositions[i * 3 + 1] = 0;
      pulsePositions[i * 3 + 2] = 0;

      pulseColors[i * 3 + 0] = 0.3;
      pulseColors[i * 3 + 1] = 0.9;
      pulseColors[i * 3 + 2] = 1.0;

      pulsePhases[i] = (i % PULSES_PER_LINE) / PULSES_PER_LINE + Math.random() * 0.1;
    }

    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulsePositions, 3));
    pulseGeo.setAttribute('color', new THREE.BufferAttribute(pulseColors, 3));

    const pulseMat = new THREE.PointsMaterial({
      size: 0.16,
      vertexColors: true,
      transparent: true,
      opacity: isDark ? 0.95 : 0.85,
      blending: isDark ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    const pulsesMesh = new THREE.Points(pulseGeo, pulseMat);
    scene.add(pulsesMesh);
    smokePulsesRef.current = pulsesMesh;
    pulsePhasesRef.current = pulsePhases;
  };

  /**
   * 3D Local Obstacle Deflection Engine
   * Evaluates surface penetration and aerodynamic deflection in the model's canonical local frame.
   */
  const computeLocalObstacleDeflection = (
    xL: number,
    yL: number,
    zL: number,
    preset: string,
    isDrs: boolean,
    time: number
  ): { dX: number; dY: number; dZ: number; speedMul: number } => {
    let dX = 0;
    let dY = 0;
    let dZ = 0;
    let speedMul = 1.0;

    switch (preset) {
      case 'sphere':
      case 'golf-ball': {
        const R = preset === 'golf-ball' ? 0.98 : 1.0;
        const rPerp = Math.sqrt(yL * yL + zL * zL);
        const clearance = 0.08;
        const Reff = R + clearance;

        if (Math.abs(xL) < Reff) {
          const Rslice = Math.sqrt(Math.max(0, Reff * Reff - xL * xL));
          if (rPerp < Rslice) {
            const s = Rslice / Math.max(0.001, rPerp);
            dY = yL * (s - 1);
            dZ = zL * (s - 1);
            speedMul = 1.48;
          }
        } else if (xL < -Reff && xL > -Reff * 2.2) {
          // Upstream stagnation flaring
          const eta = 1.0 / (1.0 + Math.pow((xL + Reff) / 1.2, 2));
          if (rPerp < Reff * 1.5) {
            const push = (Reff - rPerp) * eta * 0.65;
            if (rPerp > 0.001) {
              dY = (yL / rPerp) * push;
              dZ = (zL / rPerp) * push;
            }
          }
        }

        // Downstream wake separation
        const sepX = preset === 'golf-ball' ? R * 0.92 : R * 0.72;
        if (xL > sepX) {
          const wakeDecay = Math.exp(-(xL - sepX) / (preset === 'golf-ball' ? 2.5 : 3.4));
          const amp = preset === 'golf-ball' ? 0.04 : 0.09;
          dY += amp * Math.sin(4.0 * xL - 8.0 * time + yL * 2.5) * wakeDecay;
          speedMul = preset === 'golf-ball' ? 0.55 + 0.35 * (1 - wakeDecay) : 0.35 + 0.45 * (1 - wakeDecay);
        }
        break;
      }

      case 'cylinder': {
        const R = 0.8;
        const zExtent = 1.35;
        const clearance = 0.06;
        const Reff = R + clearance;

        if (Math.abs(zL) <= zExtent) {
          if (Math.abs(xL) < Reff) {
            const Yslice = Math.sqrt(Math.max(0, Reff * Reff - xL * xL));
            if (Math.abs(yL) < Yslice) {
              dY = Math.sign(yL || 1) * (Yslice - Math.abs(yL));
              speedMul = 1.58;
            }
          } else if (xL < -Reff && xL > -Reff * 2.0) {
            const eta = 1.0 / (1.0 + Math.pow((xL + Reff) / 1.1, 2));
            dY = Math.sign(yL || 1) * (Reff - Math.abs(yL)) * eta * 0.6;
          }

          if (xL > R * 0.75) {
            const wakeDecay = Math.exp(-(xL - R * 0.75) / 3.8);
            dY += 0.13 * Math.sin(4.5 * xL - 10.0 * time + Math.sign(yL || 1) * 1.5) * wakeDecay;
            speedMul = 0.3 + 0.5 * (1 - wakeDecay);
          }
        } else if (Math.abs(zL) <= zExtent + 0.35) {
          dZ = Math.sign(zL) * 0.18 * Math.exp(-Math.pow(xL / 1.2, 2));
        }
        break;
      }

      case 'flat-plate': {
        const halfH = 1.22;
        const halfW = 0.95;
        const clearance = 0.06;

        if (Math.abs(yL) <= halfH && Math.abs(zL) <= halfW) {
          if (Math.abs(xL) < 0.18) {
            dY = Math.sign(yL || 1) * (halfH + clearance - Math.abs(yL));
            speedMul = 0.35;
          } else if (xL < -0.18 && xL > -1.5) {
            const eta = 1.0 / (1.0 + Math.pow(xL / 0.8, 2));
            dY = Math.sign(yL || 1) * (halfH + clearance - Math.abs(yL)) * eta * 0.65;
          }

          if (xL > 0.1) {
            const wakeDecay = Math.exp(-xL / 3.0);
            dY += 0.22 * Math.sin(3.5 * xL - 7.5 * time + Math.sign(yL || 1) * 2.0) * wakeDecay;
            speedMul = 0.25 + 0.4 * (1 - wakeDecay);
          }
        }
        break;
      }

      case 'naca0012':
      case 'naca4412': {
        const chord = 3.0;
        const xNorm = (xL + chord * 0.5) / chord;
        const isCambered = preset === 'naca4412';
        const zExtent = 1.15;
        const clearance = 0.05;

        if (Math.abs(zL) <= zExtent && xNorm >= 0.0 && xNorm <= 1.0) {
          const yt =
            5 *
            0.12 *
            chord *
            (0.2969 * Math.sqrt(xNorm) -
              0.126 * xNorm -
              0.3516 * xNorm * xNorm +
              0.2843 * Math.pow(xNorm, 3) -
              0.1015 * Math.pow(xNorm, 4));

          let yc = 0;
          if (isCambered) {
            const m = 0.04;
            const p = 0.4;
            yc =
              xNorm < p
                ? (m / (p * p)) * (2 * p * xNorm - xNorm * xNorm) * chord
                : (m / Math.pow(1 - p, 2)) * (1 - 2 * p + 2 * p * xNorm - xNorm * xNorm) * chord;
          }

          const yTop = yc + yt + clearance;
          const yBot = yc - yt - clearance;

          if (yL >= yc) {
            if (yL < yTop) {
              dY = yTop - yL;
              speedMul = 1.2 + 0.6 * Math.sin(Math.PI * Math.min(1, xNorm * 1.5));
            }
          } else {
            if (yL > yBot) {
              dY = yBot - yL;
              speedMul = 0.85 + 0.25 * xNorm;
            }
          }
        } else if (Math.abs(zL) <= zExtent && xL > chord * 0.5) {
          // Trailing downwash
          const distPast = xL - chord * 0.5;
          const decay = Math.exp(-distPast / 5.5);
          dY -= 0.16 * Math.min(2.0, distPast) * decay;
        }
        break;
      }

      case 'f1-rear-wing': {
        // Multi-Element F1 Rear Wing
        const zSpan = 1.36;
        if (Math.abs(zL) <= zSpan) {
          // Mainplane [-0.75, 0.35]
          if (xL >= -0.75 && xL <= 0.35) {
            const prog = (xL + 0.75) / 1.1;
            const yBot = -0.08 - 0.28 * Math.sin(Math.PI * prog);
            const yTop = 0.06 + 0.14 * Math.sin(Math.PI * prog);

            if (yL < yTop + 0.05 && yL > yBot - 0.05) {
              if (yL >= 0) dY = yTop + 0.05 - yL;
              else dY = yBot - 0.05 - yL;
              speedMul = 1.45;
            }
          }

          // Upper Flap [0.15, 0.88]
          if (xL >= 0.15 && xL <= 0.88) {
            if (!isDrs) {
              // DRS CLOSED: Steep flap forming huge upwash scoop
              const flapBot = 0.18 + 0.42 * ((xL - 0.15) / 0.73);
              const flapTop = flapBot + 0.16;

              if (yL >= -0.05 && yL < flapTop + 0.06) {
                dY = flapTop + 0.06 - yL;
                speedMul = 1.75; // intense suction crest
              }
            } else {
              // DRS OPEN: Flap lifted flat! Open slot gap at yL in [0.12, 0.30]
              const slotMin = 0.12;
              const slotMax = 0.30;

              if (yL >= slotMin && yL <= slotMax) {
                // FLOW STREAMS CLEANLY THROUGH THE OPEN 85mm SLOT GAP
                dY = (0.21 - yL) * 0.35; // centers gently
                speedMul = 1.72; // clean venturi jet
              } else if (yL > slotMax && yL < 0.48) {
                // over flat flap
                dY = 0.48 - yL;
                speedMul = 1.25;
              }
            }
          }

          // Downstream wake & upwash
          if (xL > 0.88) {
            const dist = xL - 0.88;
            if (!isDrs) {
              const decay = Math.exp(-dist / 3.8);
              dY += 0.32 * decay + 0.16 * Math.sin(4.2 * dist - 11.0 * time) * decay;
              speedMul = 0.35 + 0.45 * (1 - decay);
            } else {
              const decay = Math.exp(-dist / 2.6);
              dY += 0.08 * decay + 0.08 * Math.sin(3.5 * dist - 9.0 * time) * decay;
              speedMul = 0.65 + 0.35 * (1 - decay);
            }
          }
        } else if (Math.abs(zL) <= zSpan + 0.35) {
          // Endplate Tip Vortex Curling
          if (xL > 0) {
            const distTip = Math.abs(zL) - zSpan;
            const decay = Math.exp(-xL / 3.2);
            dY += Math.sign(zL) * 0.22 * Math.sin(6.0 * xL - 12.0 * time) * decay * Math.exp(-distTip * 4);
            dZ += 0.18 * Math.cos(6.0 * xL - 12.0 * time) * decay * Math.exp(-distTip * 4);
          }
        }
        break;
      }

      case 'car-body': {
        const halfW = 0.85;
        if (Math.abs(zL) <= halfW && xL >= -1.85 && xL <= 1.85) {
          let roofY = -0.25;
          if (xL < -0.9) {
            roofY = -0.15 + (0.35 * (xL + 1.85)) / 0.95;
          } else if (xL < -0.2) {
            roofY = 0.20 + (0.50 * (xL + 0.9)) / 0.7;
          } else if (xL < 0.8) {
            roofY = 0.70;
          } else {
            roofY = 0.70 - (0.45 * (xL - 0.8)) / 1.05;
          }

          if (yL >= -0.25 && yL < roofY + 0.06) {
            dY = roofY + 0.06 - yL;
            speedMul = xL > -0.9 && xL < 0.2 ? 1.55 : 1.25;
          } else if (yL < -0.25 && yL > -0.65) {
            dY = -0.65 - yL;
          }
        } else if (Math.abs(zL) <= halfW && xL > 1.85) {
          const dist = xL - 1.85;
          const decay = Math.exp(-dist / 2.5);
          dY += 0.12 * Math.sin(4.0 * dist - 8.0 * time) * decay;
          speedMul = 0.4 + 0.5 * (1 - decay);
        }
        break;
      }

      case 'jet-airliner': {
        // Fuselage cylinder
        const fuseR = 0.52;
        const rFuse = Math.sqrt(yL * yL + zL * zL);
        if (xL >= -2.4 && xL <= 2.0 && rFuse < fuseR + 0.06) {
          const s = (fuseR + 0.06) / Math.max(0.001, rFuse);
          dY = yL * (s - 1);
          dZ = zL * (s - 1);
          speedMul = 1.25;
        }

        // Swept Wings
        if (Math.abs(zL) > 0.45 && Math.abs(zL) < 2.15) {
          const xWing = (Math.abs(zL) - 0.45) * 0.35;
          if (Math.abs(xL - xWing) < 0.55 && Math.abs(yL) < 0.16) {
            dY = Math.sign(yL || 1) * (0.16 - Math.abs(yL));
            speedMul = 1.4;
          }
          if (xL > xWing + 0.55) {
            dY -= 0.18 * Math.exp(-(xL - xWing - 0.55) / 3.0);
          }
        }
        break;
      }

      case 'supersonic-jet': {
        // Mach Cone Wedge
        const noseX = -2.4;
        if (xL >= noseX && xL <= 1.6) {
          const coneR = Math.max(0.12, (xL - noseX) * 0.22);
          const rDist = Math.sqrt(yL * yL + zL * zL);
          if (rDist < coneR + 0.06) {
            const req = coneR + 0.06;
            dY = (yL / Math.max(0.001, rDist)) * (req - rDist);
            dZ = (zL / Math.max(0.001, rDist)) * (req - rDist);
            speedMul = 1.5;
          }
        }
        // Delta wing
        if (Math.abs(zL) > 0.4 && Math.abs(zL) < 1.5 && xL > 0.4) {
          dY += Math.sign(zL) * 0.12 * Math.sin(5.0 * xL - 10.0 * time) * Math.exp(-(xL - 0.4) / 3.5);
        }
        break;
      }

      case 'propeller-blade': {
        const rDist = Math.sqrt(yL * yL + zL * zL);
        if (rDist < 1.6 && Math.abs(xL) < 0.45) {
          const swirlAngle = 0.35 * (1.0 - Math.abs(xL) / 0.45);
          const curAng = Math.atan2(yL, zL) + swirlAngle;
          dY = Math.sin(curAng) * rDist - yL;
          dZ = Math.cos(curAng) * rDist - zL;
          speedMul = 1.45;
        }
        break;
      }

      default: {
        // Generic bounding box fallback
        const halfSize = 0.65;
        if (Math.abs(zL) <= halfSize && Math.abs(xL) <= halfSize && Math.abs(yL) <= halfSize) {
          dY = Math.sign(yL || 1) * (halfSize + 0.06 - Math.abs(yL));
        }
        break;
      }
    }

    return { dX, dY, dZ, speedMul };
  };

  // Update Streamlines and Smoke Pulses in the Animation Frame
  const updateStreamlines = (dt: number, time: number) => {
    if (!streamlineLinesRef.current) return;

    const linePositions = streamlineLinesRef.current.geometry.attributes.position.array as Float32Array;
    const lineColors = streamlineLinesRef.current.geometry.attributes.color.array as Float32Array;

    const xStart = -TUNNEL_LENGTH / 2 + 0.35;
    const dx = (TUNNEL_LENGTH - 0.7) / SEGMENTS_PER_LINE;

    const aoa = aoaRef.current;
    const yaw = yawRef.current;
    const roll = rollRef.current;
    const isDrs = drsOpenRef.current;
    const currentPreset = presetIdRef.current;
    const snapshot = flowSnapshotRef.current;

    // Convert orientation angles into model 3D rotation matrix and inverse rotation matrix
    const radAoA = (-aoa * Math.PI) / 180; // Pitch around Z
    const radYaw = (yaw * Math.PI) / 180;  // Yaw around Y
    const radRoll = (roll * Math.PI) / 180; // Roll around X

    const euler = new THREE.Euler(radRoll, radYaw, radAoA, 'XYZ');
    const rotMat = new THREE.Matrix4().makeRotationFromEuler(euler);
    const invRotMat = new THREE.Matrix4().copy(rotMat).invert();

    // Cache matrix elements for ultra-fast zero-allocation affine transformations
    const re = rotMat.elements;
    const ie = invRotMat.elements;

    let vIdx = 0;
    streamlineSeeds.forEach((seed, lineIdx) => {
      const isVisible = rakeMode === '3d' || seed.isCenter;
      const pathCache = streamlinePathsRef.current[lineIdx];

      let curX = xStart;
      let curY = seed.y0;
      let curZ = seed.z0;

      if (pathCache) {
        pathCache[0] = curX;
        pathCache[1] = curY;
        pathCache[2] = curZ;
      }

      for (let s = 0; s < SEGMENTS_PER_LINE; s++) {
        const x1 = curX;
        const y1 = curY;
        const z1 = curZ;

        const nextX = x1 + dx;

        // 1. Transform world coordinates relative to model center into local model coordinates
        const relX = nextX - MODEL_X_OFFSET;
        const relY = seed.y0;
        const relZ = seed.z0;

        const xL = ie[0] * relX + ie[4] * relY + ie[8] * relZ;
        const yL = ie[1] * relX + ie[5] * relY + ie[9] * relZ;
        const zL = ie[2] * relX + ie[6] * relY + ie[10] * relZ;

        // 2. Evaluate physical 3D obstacle collision in local model space
        const localDef = computeLocalObstacleDeflection(xL, yL, zL, currentPreset, isDrs, time);
        const speedFactor = localDef.speedMul;

        // 3. Transform deflection displacement back into world coordinates
        const dXw = re[0] * localDef.dX + re[4] * localDef.dY + re[8] * localDef.dZ;
        const dYw = re[1] * localDef.dX + re[5] * localDef.dY + re[9] * localDef.dZ;
        const dZw = re[2] * localDef.dX + re[6] * localDef.dY + re[10] * localDef.dZ;

        let nextY = seed.y0 + dYw;
        let nextZ = seed.z0 + dZw;

        // 4. Layer live CFD velocity perturbations from LBM solver snapshot
        if (snapshot && snapshot.uX && snapshot.uY) {
          const nx = snapshot.width;
          const ny = snapshot.height;
          const normX = (nextX - MODEL_X_OFFSET) / TUNNEL_LENGTH + 0.45;
          const normY = nextY / TUNNEL_HEIGHT + 0.50;

          if (normX >= 0 && normX < 1 && normY >= 0 && normY < 1) {
            const gx = Math.floor(normX * nx);
            const gy = Math.floor(normY * ny);
            const idx = gy * nx + gx;
            const uYArr = new Float32Array(snapshot.uY);
            const cfdVy = uYArr[idx] || 0;
            nextY += cfdVy * 0.35 * dx;
          }
        }

        // 5. Clamp to physical wind tunnel glass walls
        nextY = Math.max(-TUNNEL_HEIGHT / 2 + 0.08, Math.min(TUNNEL_HEIGHT / 2 - 0.08, nextY));
        nextZ = Math.max(-TUNNEL_WIDTH / 2 + 0.08, Math.min(TUNNEL_WIDTH / 2 - 0.08, nextZ));

        curX = nextX + dXw * 0.15;
        curY = nextY;
        curZ = nextZ;

        if (pathCache) {
          pathCache[(s + 1) * 3 + 0] = curX;
          pathCache[(s + 1) * 3 + 1] = curY;
          pathCache[(s + 1) * 3 + 2] = curZ;
        }

        linePositions[vIdx * 3 + 0] = x1;
        linePositions[vIdx * 3 + 1] = y1;
        linePositions[vIdx * 3 + 2] = z1;

        linePositions[(vIdx + 1) * 3 + 0] = curX;
        linePositions[(vIdx + 1) * 3 + 1] = curY;
        linePositions[(vIdx + 1) * 3 + 2] = curZ;

        // Dynamic vertex color based on local flow velocity
        // Freestream Cyan -> Accelerated Neon Emerald -> Stagnation/Wake Amber
        let cr = 0.22;
        let cg = 0.78;
        let cb = 0.98;

        if (speedFactor > 1.25) {
          cr = 0.15;
          cg = 0.98;
          cb = 0.45;
        } else if (speedFactor < 0.65) {
          cr = 0.96;
          cg = 0.48;
          cb = 0.22;
        }

        const alphaMul = isVisible ? 1.0 : 0.0;
        for (let k = 0; k < 2; k++) {
          lineColors[(vIdx + k) * 3 + 0] = cr * alphaMul;
          lineColors[(vIdx + k) * 3 + 1] = cg * alphaMul;
          lineColors[(vIdx + k) * 3 + 2] = cb * alphaMul;
        }

        vIdx += 2;
      }
    });

    streamlineLinesRef.current.geometry.attributes.position.needsUpdate = true;
    streamlineLinesRef.current.geometry.attributes.color.needsUpdate = true;

    // Animate Smoke Pulse Beads Traveling Along the Lines
    if (smokePulsesRef.current && pulsePhasesRef.current) {
      const pulsePos = smokePulsesRef.current.geometry.attributes.position.array as Float32Array;
      const pulseCol = smokePulsesRef.current.geometry.attributes.color.array as Float32Array;
      const phases = pulsePhasesRef.current;

      const flowSpeedFactor = 0.48;

      let pIdx = 0;
      streamlineSeeds.forEach((seed, lineIdx) => {
        const isVisible = rakeMode === '3d' || seed.isCenter;
        const pathCache = streamlinePathsRef.current[lineIdx];
        if (!pathCache) return;

        for (let p = 0; p < PULSES_PER_LINE; p++) {
          phases[pIdx] = (phases[pIdx] + dt * flowSpeedFactor) % 1.0;
          const u = phases[pIdx];

          const exactSeg = u * SEGMENTS_PER_LINE;
          const segIdx = Math.floor(exactSeg);
          const frac = exactSeg - segIdx;

          const pt0X = pathCache[segIdx * 3 + 0];
          const pt0Y = pathCache[segIdx * 3 + 1];
          const pt0Z = pathCache[segIdx * 3 + 2];

          const pt1X = pathCache[(segIdx + 1) * 3 + 0];
          const pt1Y = pathCache[(segIdx + 1) * 3 + 1];
          const pt1Z = pathCache[(segIdx + 1) * 3 + 2];

          const px = pt0X + (pt1X - pt0X) * frac;
          const py = pt0Y + (pt1Y - pt0Y) * frac;
          const pz = pt0Z + (pt1Z - pt0Z) * frac;

          pulsePos[pIdx * 3 + 0] = px;
          pulsePos[pIdx * 3 + 1] = py;
          pulsePos[pIdx * 3 + 2] = pz;

          const visAlpha = isVisible ? 1.0 : 0.0;
          pulseCol[pIdx * 3 + 0] = 0.88 * visAlpha;
          pulseCol[pIdx * 3 + 1] = 0.98 * visAlpha;
          pulseCol[pIdx * 3 + 2] = 1.0 * visAlpha;

          pIdx++;
        }
      });

      smokePulsesRef.current.geometry.attributes.position.needsUpdate = true;
      smokePulsesRef.current.geometry.attributes.color.needsUpdate = true;
    }
  };

  // Camera View Presets
  const setCameraView = (view: 'side' | 'iso' | 'top') => {
    if (!cameraRef.current || !controlsRef.current) return;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    controls.target.set(MODEL_X_OFFSET, 0, 0);

    if (view === 'side') {
      camera.position.set(MODEL_X_OFFSET, 0, 8.8);
    } else if (view === 'top') {
      camera.position.set(MODEL_X_OFFSET, 8.8, 0.001);
    } else {
      camera.position.set(-6.8, 3.8, 9.2);
    }

    controls.update();
  };

  // Quick Rotation Snap Actions
  const handleQuickRotate = (action: 'level' | 'aoa_up' | 'aoa_down' | 'crosswind' | 'invert') => {
    switch (action) {
      case 'level':
        onRotationChange?.(0, 0, 0);
        break;
      case 'aoa_up':
        onRotationChange?.(Math.min(90, angleOfAttack + 10), yawAngle, rollAngle);
        break;
      case 'aoa_down':
        onRotationChange?.(Math.max(-90, angleOfAttack - 10), yawAngle, rollAngle);
        break;
      case 'crosswind':
        onRotationChange?.(0, 90, 0);
        break;
      case 'invert':
        onRotationChange?.(0, 0, 180);
        break;
    }
  };

  // Custom 3D Model File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !modelGroupRef.current) return;

    setUploadedFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.obj')) {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const loader = new OBJLoader();
        const obj = loader.parse(text);

        const box = new THREE.Box3().setFromObject(obj);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
          const scale = 2.4 / maxDim;
          obj.scale.set(scale, scale, scale);
        }

        const group = modelGroupRef.current!;
        while (group.children.length > 0) group.remove(group.children[0]);
        group.add(obj);

        const newBox = new THREE.Box3().setFromObject(obj);
        customBBoxRef.current = { min: newBox.min, max: newBox.max };

        if (onCustomModelLoaded) {
          onCustomModelLoaded(obj);
        }
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
      reader.onload = (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const loader = new GLTFLoader();
        loader.parse(arrayBuffer, '', (gltf) => {
          const obj = gltf.scene;

          const box = new THREE.Box3().setFromObject(obj);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 0) {
            const scale = 2.4 / maxDim;
            obj.scale.set(scale, scale, scale);
          }

          const group = modelGroupRef.current!;
          while (group.children.length > 0) group.remove(group.children[0]);
          group.add(obj);

          const newBox = new THREE.Box3().setFromObject(obj);
          customBBoxRef.current = { min: newBox.min, max: newBox.max };

          if (onCustomModelLoaded) {
            onCustomModelLoaded(obj);
          }
        });
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner select-none">
      {/* 3D WebGL Canvas Mount */}
      <div
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={`w-full h-full ${
          interactionMode === 'model' ? 'cursor-move' : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* Viewport Floating Top Controls */}
      <div className="absolute top-3 right-3 flex flex-wrap items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs z-10">
        {/* Interaction Mode: Orbit View vs Rotate Model */}
        <div className="flex rounded-md bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 mr-1">
          <button
            onClick={() => {
              if (interactionMode !== 'camera') toggleInteractionMode();
            }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors flex items-center gap-1 ${
              interactionMode === 'camera'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Orbit Camera around wind tunnel (Left click & drag)"
          >
            <Compass className="w-3.5 h-3.5 text-blue-500" />
            <span>Camera</span>
          </button>
          <button
            onClick={() => {
              if (interactionMode !== 'model') toggleInteractionMode();
            }}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors flex items-center gap-1 ${
              interactionMode === 'model'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Rotate Object directly inside wind tunnel (Drag = Pitch/Yaw, Shift+Drag = Roll)"
          >
            <Move3d className="w-3.5 h-3.5 text-emerald-500" />
            <span>Rotate Object</span>
          </button>
        </div>

        {/* Camera Views */}
        <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-1.5">
          <button
            onClick={() => setCameraView('side')}
            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium transition-colors flex items-center gap-1"
            title="Side Profile View (Observe Curvature)"
          >
            <Eye className="w-3 h-3 text-cyan-500" />
            <span className="hidden sm:inline">Side</span>
          </button>
          <button
            onClick={() => setCameraView('iso')}
            className="px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium transition-colors"
            title="3D Perspective View"
          >
            <span className="hidden sm:inline">3D</span>
          </button>
          <button
            onClick={() => setCameraView('iso')}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
            title="Reset Camera"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        {/* F1 DRS Toggle Button (Shown when preset is F1 Rear Wing) */}
        {presetId === 'f1-rear-wing' && (
          <button
            onClick={onToggleDrs}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase transition-all shadow-xs ${
              drsOpen
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
            }`}
            title="Toggle Formula 1 Drag Reduction System flap (Hotkey: D)"
          >
            <Zap className={`w-3.5 h-3.5 ${drsOpen ? 'fill-current' : 'text-emerald-400'}`} />
            <span>DRS {drsOpen ? 'OPEN' : 'CLOSED'}</span>
          </button>
        )}

        {/* Streamline Rake Mode (3D Volume vs Center Profile) */}
        <div className="flex rounded-md bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setRakeMode('3d')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
              rakeMode === '3d'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Full 3D Smoke Rake (55 Lines)"
          >
            3D Rake
          </button>
          <button
            onClick={() => setRakeMode('center')}
            className={`px-2 py-0.5 text-[11px] font-medium rounded transition-colors ${
              rakeMode === 'center'
                ? 'bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
            title="Center Profile Sheet (24 Lines)"
          >
            Sheet
          </button>
        </div>

        {/* Streamlines Toggle */}
        <button
          onClick={() => setShowStreamlines(!showStreamlines)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors font-medium ${
            showStreamlines
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Streamlines"
        >
          <Wind className="w-3 h-3" />
          <span className="hidden sm:inline">Lines</span>
        </button>

        {/* Tunnel Enclosure Toggle */}
        <button
          onClick={() => setShowTunnelWalls(!showTunnelWalls)}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors font-medium ${
            showTunnelWalls
              ? 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle Wind Tunnel Enclosure"
        >
          <Box className="w-3 h-3" />
          <span className="hidden sm:inline">Tunnel</span>
        </button>
      </div>

      {/* Floating Rotation Snap Bar (Top Left) */}
      <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs z-10">
        <span className="text-[10px] font-mono text-slate-400 uppercase mr-1">Rotate:</span>
        <button
          onClick={() => handleQuickRotate('level')}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono transition-colors"
          title="Reset to 0° Level"
        >
          0°
        </button>
        <button
          onClick={() => handleQuickRotate('aoa_up')}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono transition-colors"
          title="Pitch Up (+10° AoA)"
        >
          +10°
        </button>
        <button
          onClick={() => handleQuickRotate('aoa_down')}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono transition-colors"
          title="Pitch Down (-10° AoA)"
        >
          -10°
        </button>
        <button
          onClick={() => handleQuickRotate('crosswind')}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono transition-colors"
          title="90° Crosswind Yaw"
        >
          90° Yaw
        </button>
        <button
          onClick={() => handleQuickRotate('invert')}
          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[11px] font-mono transition-colors"
          title="Inverted (180° Roll)"
        >
          180° Roll
        </button>
      </div>

      {/* Floating Bottom Left Toolbar: Upload, Orientation readout, Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2 z-10">
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">
          <Upload className="w-3.5 h-3.5" />
          <span>{uploadedFileName ? uploadedFileName : 'Upload .obj / .glb'}</span>
          <input
            type="file"
            accept=".obj,.glb,.gltf"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>

        {/* Live Orientation Readout */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-300 shadow-sm">
          <span className="text-blue-600 dark:text-blue-400 font-semibold">Pitch (AoA): {angleOfAttack}°</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Yaw: {yawAngle}°</span>
          <span className="text-purple-600 dark:text-purple-400 font-semibold">Roll: {rollAngle}°</span>
        </div>

        {/* Rotate Mode Hint */}
        {interactionMode === 'model' && (
          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 rounded-lg text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
            <MousePointer className="w-3 h-3 text-emerald-600" />
            <span>Drag: Pitch/Yaw | Shift+Drag: Roll</span>
          </div>
        )}

        {/* Flow Legend indicator */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>Freestream</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1"></span>
          <span>Suction Curve</span>
          <span className="w-2 h-2 rounded-full bg-amber-500 ml-1"></span>
          <span>Wake / Stagnation</span>
        </div>
      </div>
    </div>
  );
};

export default WindTunnelViewport;
