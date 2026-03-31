import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib'; // Stable import for modern React environments
import { Analytics } from "@vercel/analytics/react";

// ==========================================
// ASSET URL RESOLVER
// Ensures absolute URLs are generated for 3D models to bypass iframe/blob 'Request constructor' errors.
// ==========================================
const getAssetUrl = (filename) => {
  const origin = window.location.origin;
  if (origin && origin !== 'null') {
    const path = window.location.pathname || '/';
    const dir = path.substring(0, path.lastIndexOf('/') + 1);
    return origin + dir + filename;
  }
  return filename; // Fallback
};

// ==========================================
// ERROR BOUNDARY (Prevents white screens)
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen bg-red-900 text-white flex flex-col items-center justify-center p-8">
          <h1 className="text-4xl font-bold mb-4">Application Crashed</h1>
          <p className="mb-4">Something went wrong during rendering. Check the error below:</p>
          <pre className="bg-black/50 p-4 rounded text-sm w-full max-w-3xl overflow-auto border border-red-500">
            {this.state.error.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// Helper SVGs to replace external icon libraries for maximum stability
const Icons = {
  ChevronRight: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>,
  Calendar: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>,
  Award: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></svg>,
  Film: () => <svg className="text-cyan-400 w-12 h-12 mb-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18" /><path d="M3 7.5h4" /><path d="M3 12h18" /><path d="M3 16.5h4" /><path d="M17 3v18" /><path d="M17 7.5h4" /><path d="M17 16.5h4" /></svg>,
  PlaySquare: () => <svg className="text-cyan-400 shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="m9 8 6 4-6 4Z" /></svg>,
  AlertTriangle: () => <svg className="text-yellow-400 shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
  CheckCircle: ({ className }) => <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>,
  Trophy: ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>,
  Medal: ({ size = 18 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6.1 2h11.8a2 2 0 0 1 1.7.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" /><path d="M11 12 5.12 2.2" /><path d="m13 12 5.88-9.8" /><path d="M8 7h8" /><circle cx="12" cy="17" r="5" /><path d="M12 18v-2h-.5" /></svg>,
  Video: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>,
  Camera: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>,
  Clock: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
  Star: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
  User: ({ size = 16 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
};

function App() {
  const canvasRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('submission');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [muteOpacity, setMuteOpacity] = useState(1);
  const bgMusicRef = useRef(null);
  const shutterRef = useRef(null);
  const logoImgRef = useRef(null);

  useEffect(() => {
    bgMusicRef.current = new Audio(getAssetUrl('loop.mp3.mp3'));
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.56;

    shutterRef.current = new Audio(getAssetUrl('kakaist-camera-shutter-314056.mp3'));
    shutterRef.current.volume = 0.4;

    const handleGlobalClick = () => {
      if (shutterRef.current) {
        shutterRef.current.currentTime = 0;
        shutterRef.current.play().catch(() => { });
      }
    };

    window.addEventListener('click', handleGlobalClick);

    // Preload logo for Hero
    const logoImg = new Image();
    logoImg.src = getAssetUrl('cincecrcepng (1).png');
    logoImg.onload = () => { logoImgRef.current = logoImg; };

    return () => window.removeEventListener('click', handleGlobalClick);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollContainerRef.current) {
        const st = scrollContainerRef.current.scrollTop;
        const opacity = Math.max(0.3, 1 - st / 400);
        setMuteOpacity(opacity);
      }
    };
    const sc = scrollContainerRef.current;
    if (sc) sc.addEventListener('scroll', handleScroll);
    return () => { if (sc) sc.removeEventListener('scroll', handleScroll); };
  }, []);

  const toggleMute = () => {
    if (bgMusicRef.current) {
      if (isMuted) {
        bgMusicRef.current.play().catch(() => { });
      } else {
        bgMusicRef.current.pause();
      }
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    // 1. SCENE SETUP
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#050812', 10, 80);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    // 2. LIGHTING
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight1 = new THREE.DirectionalLight(0xFFD700, 1.5);
    dirLight1.position.set(10, 10, 5);
    scene.add(dirLight1);
    const dirLight2 = new THREE.DirectionalLight(0x00E5FF, 1);
    dirLight2.position.set(-10, -10, -5);
    scene.add(dirLight2);

    // 3. MATERIALS
    const matGold = new THREE.MeshStandardMaterial({ color: 0xFFD700, metalness: 0.8, roughness: 0.2 });
    const matGlass = new THREE.MeshPhysicalMaterial({ color: 0x00E5FF, transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1 });
    const matChrome = new THREE.MeshStandardMaterial({ color: 0x1C2A4F, metalness: 0.9, roughness: 0.4 });
    const matWhiteGlass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, roughness: 0.2, clearcoat: 1, side: THREE.DoubleSide });

    // Initialize Loading Manager
    const manager = new THREE.LoadingManager();
    manager.onProgress = (url, itemsLoaded, itemsTotal) => {
      setLoadingProgress(Math.round((itemsLoaded / itemsTotal) * 100));
    };
    manager.onLoad = () => {
      // Small delay for smooth transition
      setTimeout(() => setIsLoading(false), 500);
    };

    // Initialize GLTF Loader with Manager
    const gltfLoader = new GLTFLoader(manager);

    // Store objects that need to float/animate
    const floaters = [];

    // 4. PROCEDURAL ASSETS (Modernized Hero)
    // Asset 1: High-Tech Camera (GLB Model)
    const camGroup = new THREE.Group();
    camGroup.position.set(0, -0.2, -4); // Lowered slightly and pushed back for better framing
    scene.add(camGroup);
    floaters.push({ obj: camGroup, speed: 2, rotInt: 0.5, floatInt: 1, initY: -0.2 });

    gltfLoader.load(getAssetUrl('high_tech_camera.glb'), (gltf) => {
      try {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        model.position.set(-center.x, -center.y, -center.z); // Center Pivot
        const wrapper = new THREE.Group();
        wrapper.add(model);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0 && maxDim !== Infinity) {
          wrapper.scale.setScalar(4.5 / maxDim); // Significantly larger for better presence
        }

        camGroup.add(wrapper);
      } catch (e) { console.error("Error processing high_tech_camera.glb", e); }
    }, undefined, (e) => {
      console.error("Failed to load high_tech_camera.glb, creating procedural fallback", e);
      // Fallback procedural camera if GLB fails
      const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 3), matChrome);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 1, 32), matGlass);
      lens.rotation.x = Math.PI / 2; lens.position.z = 1.6;
      camGroup.add(body, lens);
    });

    // Asset 2: Uploaded Clapperboard (Brining closer for better visibility)
    const clapperGroup = new THREE.Group();
    clapperGroup.position.set(-1.2, 0.015, -18.5); // Left side, framing the Right-aligned About card
    clapperGroup.rotation.y = -Math.PI / 6;
    clapperGroup.scale.set(0.5, 0.5, 0.5);
    scene.add(clapperGroup);
    floaters.push({ obj: clapperGroup, speed: 1.5, rotInt: 1, floatInt: 1, initY: 0.5 });

    // Add Procedural Fallback immediately
    const fallbackClapper = new THREE.Group();
    const base = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.2), matChrome);
    base.position.y = -0.5;
    const top = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 0.2), matGlass);
    top.position.y = 0.6; top.rotation.z = -0.3;
    const det1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.1), matGold);
    det1.position.set(-1, 0.6, 0.15); det1.rotation.z = -0.3;
    const det2 = det1.clone(); det2.position.x = 0;
    fallbackClapper.add(base, top, det1, det2);
    clapperGroup.add(fallbackClapper);

    gltfLoader.load(getAssetUrl('clapperboard.glb'), (gltf) => {
      try {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const wrapper = new THREE.Group();
        model.position.set(-center.x, -center.y, -center.z); // Center Pivot
        wrapper.add(model);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0 && maxDim !== Infinity) {
          wrapper.scale.setScalar(3 / maxDim);
        }

        // Remove fallback upon successful model load
        clapperGroup.remove(fallbackClapper);
        clapperGroup.add(wrapper);
      } catch (e) { console.error("Error processing clapperboard.glb", e); }
    }, undefined, (e) => console.error("Failed to load clapperboard.glb", e));

    // Asset 3: Uploaded Hourglass (Right side, framing the Left-aligned Timeline card)
    const glassGroup = new THREE.Group();
    glassGroup.position.set(1.5, 0, -34); // Right side as requested
    glassGroup.scale.set(0.5, 0.5, 0.5);
    scene.add(glassGroup);
    floaters.push({ obj: glassGroup, speed: 2, rotInt: 0.5, floatInt: 2, initY: 0 });

    // Add Procedural Fallback immediately
    const fallbackHourglass = new THREE.Group();
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 32), matGlass);
    cone1.position.y = 1; cone1.rotation.x = Math.PI;
    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(1, 2, 32), matGlass);
    cone2.position.y = -1;
    const con1 = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.2, 32), matGold);
    con1.position.y = 2;
    const con2 = con1.clone(); con2.position.y = -2;
    fallbackHourglass.add(cone1, cone2, con1, con2);
    glassGroup.add(fallbackHourglass);

    gltfLoader.load(getAssetUrl('hour_glass.glb'), (gltf) => {
      try {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const wrapper = new THREE.Group();
        model.position.set(-center.x, -center.y, -center.z); // Center Pivot
        wrapper.add(model);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0 && maxDim !== Infinity) {
          wrapper.scale.setScalar(4.5 / maxDim);
        }

        // Remove fallback upon successful model load
        glassGroup.remove(fallbackHourglass);
        glassGroup.add(wrapper);
      } catch (e) { console.error("Error processing hour_glass.glb", e); }
    }, undefined, (e) => console.error("Failed to load hour_glass.glb", e));

    // Asset 4: Scripts
    const scriptsGroup = new THREE.Group();
    scriptsGroup.position.set(0, 0, -48);
    scriptsGroup.scale.set(0.8, 0.8, 0.8);
    for (let i = 0; i < 3; i++) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.8), matWhiteGlass);
      mesh.position.set(Math.sin(i) * 2, (i - 1) * 1.5, Math.cos(i) * 2);
      mesh.rotation.set(Math.random(), Math.random(), Math.random());
      scriptsGroup.add(mesh);
      floaters.push({ obj: mesh, speed: 2 + i, rotInt: 1.5, floatInt: 1.5, initY: mesh.position.y, isChild: true });
    }
    scene.add(scriptsGroup);

    // Asset 5: Chair
    const chairGroup = new THREE.Group();
    chairGroup.position.set(1.5, -1, -63);
    chairGroup.scale.set(0.6, 0.6, 0.6);
    chairGroup.rotation.y = Math.PI / 6;
    const legGeom = new THREE.CylinderGeometry(0.1, 0.1, 2);
    const leg1 = new THREE.Mesh(legGeom, matChrome); leg1.position.set(-1, -1, -1);
    const leg2 = new THREE.Mesh(legGeom, matChrome); leg2.position.set(1, -1, -1);
    const leg3 = new THREE.Mesh(legGeom, matChrome); leg3.position.set(-1, -1, 1);
    const leg4 = new THREE.Mesh(legGeom, matChrome); leg4.position.set(1, -1, 1);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 2.2), matGlass);
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 0.1), matGold); back.position.set(0, 1, -1);
    chairGroup.add(leg1, leg2, leg3, leg4, seat, back);
    scene.add(chairGroup);
    floaters.push({ obj: chairGroup, speed: 1, rotInt: 0.2, floatInt: 0.5, initY: -1 });

    // Asset 6: Film Reel
    const reelGroup = new THREE.Group();
    reelGroup.position.set(0, 0, -85);
    const torus = new THREE.Mesh(new THREE.TorusGeometry(3, 0.2, 16, 100), matGold);
    reelGroup.add(torus);
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6), matChrome);
      spoke.rotation.z = (Math.PI / 4) * i;
      reelGroup.add(spoke);
    }
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1), matGlass);
    core.rotation.x = Math.PI / 2;
    reelGroup.add(core);
    scene.add(reelGroup);

    // 6. SCROLL CURVE
    const CURVE_POINTS = [
      new THREE.Vector3(0, 0, 0),         // 0: Hero
      new THREE.Vector3(0, 0, -15),       // 1: About (Camera straight)
      new THREE.Vector3(0, 0, -30),       // 2: Timeline (Camera straight)
      new THREE.Vector3(0, 0, -45),       // 3: Rules
      new THREE.Vector3(0, 0, -60),       // 4: Judging
      new THREE.Vector3(0, 0, -75),       // 5: Footer
      new THREE.Vector3(0, 0, -90),       // 6: Look-ahead anchor
    ];
    const curve = new THREE.CatmullRomCurve3(CURVE_POINTS);

    // Glowing Tube Path
    const tubeGeom = new THREE.TubeGeometry(curve, 200, 0.1, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0x00E5FF, transparent: true, opacity: 0.15, wireframe: true });
    scene.add(new THREE.Mesh(tubeGeom, tubeMat));

    // Particles (Sparkles)
    const partCount = 500;
    const posArray = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount; i++) {
      posArray[i * 3] = (Math.random() - 0.5) * 40;
      posArray[i * 3 + 1] = (Math.random() - 0.5) * 40;
      posArray[i * 3 + 2] = -Math.random() * 90;
    }
    const partGeom = new THREE.BufferGeometry();
    partGeom.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const partMat = new THREE.PointsMaterial({ size: 0.2, color: 0x00E5FF, transparent: true, opacity: 0.6 });
    scene.add(new THREE.Points(partGeom, partMat));

    // 7. RENDER & SCROLL LOOP
    let animationFrameId;
    let currentScroll = 0;
    const clock = new THREE.Clock();

    const render = () => {
      const elapsedTime = clock.getElapsedTime();

      // Update Floating Animations
      floaters.forEach(f => {
        if (!f.isChild) f.obj.position.y = f.initY + Math.sin(elapsedTime * f.speed) * f.floatInt * 0.2;
        f.obj.rotation.x += Math.sin(elapsedTime * f.speed * 0.5) * f.rotInt * 0.005;
        f.obj.rotation.y += Math.cos(elapsedTime * f.speed * 0.5) * f.rotInt * 0.005;
      });
      reelGroup.rotation.z -= 0.01;

      // Sync Camera to Scroll
      if (scrollContainerRef.current) {
        const sc = scrollContainerRef.current;
        const maxScroll = sc.scrollHeight - sc.clientHeight;
        const targetScroll = maxScroll > 0 ? (sc.scrollTop / maxScroll) * (5 / 6) : 0;

        // Snappier lerp for better feel
        currentScroll += (targetScroll - currentScroll) * 0.15;

        const pos = curve.getPointAt(currentScroll);
        camera.position.copy(pos);

        const lookAtT = Math.min(currentScroll + 0.05, 0.999);
        const lookPos = curve.getPointAt(lookAtT);
        lookPos.x += Math.sin(currentScroll * Math.PI * 2) * 0.2;
        lookPos.y += Math.cos(currentScroll * Math.PI * 2) * 0.2;
        camera.lookAt(lookPos);
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    // 8. RESIZE HANDLER
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      renderer.dispose();
      scene.clear();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-[#050812] overflow-hidden font-sans selection:bg-cyan-500 selection:text-black">

      {/* LOADING SCREEN */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#050812] transition-opacity duration-1000" style={{ backgroundImage: `radial-gradient(circle at center, rgba(0,229,255,0.05) 0%, rgba(5,8,18,1) 80%)` }}>
          <div className="relative w-64 md:w-96 text-center space-y-8 px-4">
            <h2 className="text-cyan-400 font-bold tracking-[0.3em] uppercase text-[10px] md:text-sm animate-pulse">Initializing Cinematic World</h2>

            <div className="relative h-[2px] w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 via-white to-yellow-400 transition-all duration-300 ease-out shadow-[0_0_15px_#00E5FF]"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>

            <div className="flex justify-between items-center font-mono text-[10px] md:text-xs">
              <span className="text-cyan-400/60 uppercase">System Ready</span>
              <span className="text-white text-lg font-black tracking-widest">{loadingProgress}%</span>
              <span className="text-yellow-400/60 uppercase">Cinematic Sync</span>
            </div>
          </div>
        </div>
      )}

      {/* AUDIO TOGGLE */}
      <div
        className="fixed top-4 right-4 md:top-6 md:right-6 z-50 transition-opacity duration-300"
        style={{ opacity: muteOpacity }}
      >
        <button
          onClick={toggleMute}
          className="p-2 md:p-3 bg-black/40 backdrop-blur-md border border-white/20 rounded-full hover:bg-white/10 transition-all group"
        >
          {isMuted ? (
            <svg className="text-white w-5 h-5 md:w-6 md:h-6 opacity-60 group-hover:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M23 9l-6 6M17 9l6 6" /></svg>
          ) : (
            <svg className="text-cyan-400 w-5 h-5 md:w-6 md:h-6 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" /></svg>
          )}
        </button>
      </div>

      {/* BACKGROUND BLUR LAYER (Targeted) */}
      <div className="fixed inset-0 z-0 bg-tilt-container overflow-hidden">
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage: `url('https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(1.1)'
          }}
        />
      </div>

      <canvas ref={canvasRef} className="fixed inset-0 z-1 w-full h-full pointer-events-none" style={{ background: 'transparent' }} />

      <div ref={scrollContainerRef} id="scroll-container" className="absolute inset-0 z-2 overflow-y-auto overflow-x-hidden snap-y snap-mandatory scroll-smooth overscroll-contain" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>

        <style>{`
          #scroll-container::-webkit-scrollbar { display: none; }
          * { cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2300E5FF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Ccircle cx='12' cy='12' r='3'%3E%3C/circle%3E%3C/svg%3E") 12 12, auto; }
          .glass-panel { 
            background: rgba(10, 17, 40, 0.75); 
            backdrop-filter: blur(20px); 
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          .font-futura { font-family: 'Jost', sans-serif; font-weight: 900; letter-spacing: -0.02em; }
          .font-montserrat { font-family: 'Montserrat', sans-serif; }
          .font-gill { font-family: 'PT Sans', sans-serif; }
          .cursiv-text { font-family: 'Montserrat', sans-serif; font-style: italic; }
          .cursor-zoom { transition: transform 0.4s cubic-bezier(0.165, 0.84, 0.44, 1); cursor: pointer; }
          .cursor-zoom:hover { transform: scale(1.1); z-index: 50; position: relative; }
          .bg-tilt-container { filter: blur(5px); }
          .glass-panel::-webkit-scrollbar { width: 6px; }
          .glass-panel-thumb::-webkit-scrollbar-thumb { background: rgba(0, 229, 255, 0.3); border-radius: 10px; }
        `}</style>

        <div className="flex flex-col w-full">

          <section className="min-h-screen w-full flex flex-col items-center justify-center text-white p-2 sm:p-4 md:p-12 relative snap-center">
            <div
              style={{ transform: 'translateY(-15px)' }}
              className="text-center bg-black/40 p-4 sm:p-6 md:p-10 rounded-3xl backdrop-blur-md border border-white/10 shadow-[0_0_50px_rgba(0,229,255,0.2)] glass-panel w-[95%] md:w-auto"
            >
              <h2 className="text-cyan-400 font-bold tracking-[0.2em] uppercase mb-1 md:mb-2 text-[9px] md:text-xs">Film Society — Fr. CRCE  ·  National Short Film Festival</h2>
              {/* Hero Text */}
              <div className="z-10 text-center px-1 md:px-0">
                {!logoError ? (
                  <img
                    src={getAssetUrl('cincecrcepng (1).png')}
                    alt="CineCRCE 2026"
                    className="h-28 md:h-[12rem] lg:h-[13rem] mx-auto mb-2 md:mb-4 object-contain brightness-110 drop-shadow-[0_0_40px_rgba(34,211,238,0.6)]"
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <h1 className="text-4xl md:text-8xl font-futura mb-1 md:mb-2 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-white to-yellow-300 drop-shadow-[0_0_50px_rgba(34,211,238,0.5)]">
                    CineCRCE <span className="text-cyan-400">2026</span>
                  </h1>
                )}
                <p className="text-[10px] md:text-lg text-cyan-100/80 font-futura tracking-[0.3em] uppercase mb-6 md:mb-8">
                  Time Sculpted in Cinema
                </p>

                {/* Competition Details Row (Compact) */}
                <div className="flex flex-wrap justify-center gap-4 md:gap-10 mb-8 md:mb-10 max-w-4xl mx-auto border-y border-white/10 py-4 md:py-6 backdrop-blur-sm bg-black/5 rounded-2xl md:rounded-none md:bg-transparent md:border-x-0">
                  {[
                    { label: 'Competition', value: '10 – 13 April' },
                    { label: 'Theme Reveal', value: '10 April · 9pm' },
                    { label: 'Screening', value: '16 April 2026' },
                    { label: 'Prize Pool', value: '₹ 60,000+' }
                  ].map((item, i) => (
                    <div key={i} className="flex flex-col items-center min-w-[100px] md:min-w-0">
                      <span className="text-[8px] md:text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] mb-1 md:mb-2 opacity-80">{item.label}</span>
                      <span className="text-xs md:text-base font-serif italic text-white font-medium tracking-wide drop-shadow-md whitespace-nowrap">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-center items-center">
                  <a href="https://cine-crce.vercel.app/CineCRCE%20-%20Shortfilm%20Competition.pdf" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full transition-all text-gray-200">
                    Brochure PDF
                  </a>
                  <a href="https://docs.google.com/forms/d/e/1FAIpQLSc0xir7WpQdw7Ulf9MSiR0lbSPG5GIIXxFf4MY5v0Wmg8sGOA/viewform" target="_blank" rel="noreferrer" className="group relative inline-flex items-center justify-center px-6 py-3 md:px-8 md:py-4 font-bold text-black bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full hover:scale-105 transition-all duration-300 shadow-[0_0_30px_rgba(255,215,0,0.5)] text-sm md:text-lg w-full md:w-auto">
                    Register Now <span className="hidden sm:inline">— INR 450 / team</span>
                    <span className="ml-2 group-hover:translate-x-1 transition-transform"><Icons.ChevronRight /></span>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* PAGE 1: ABOUT (Optimized) */}
          <section className="min-h-screen w-full flex items-center justify-center md:justify-end text-white p-4 md:p-24 snap-center py-16 md:py-24">
            <div className="w-[95%] md:w-1/2 lg:w-5/12 bg-[#0A1128]/80 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-cyan-500/30 shadow-2xl hover:border-cyan-400 transition-colors glass-panel max-h-none md:max-h-[85vh] md:overflow-y-auto">
              <Icons.Film />
              <h2 className="text-2xl md:text-4xl font-futura mb-4">About</h2>
              <p className="text-cyan-100/90 text-sm md:text-lg leading-relaxed mb-6 font-montserrat cursor-zoom">
                CineCRCE 2026 is a national-level competition that challenges students to push the limits of their creativity.
                Within a strictly defined 75-hour window, you must conceptualise, script, shoot, edit, and submit a complete short film from scratch.
              </p>
              <ul className="space-y-3 text-[13.5px] md:text-sm text-gray-400">
                <li className="flex items-center gap-3 cursor-zoom"><Icons.CheckCircle className="text-green-400" /> Minimum team size: 1 member</li>
                <li className="flex items-center gap-3 cursor-zoom"><Icons.CheckCircle className="text-green-400" /> Maximum team size: 10 members</li>
                <li className="flex items-center gap-3 cursor-zoom"><Icons.CheckCircle className="text-green-400" /> Open to all college students</li>
                <li className="flex items-center gap-3 cursor-zoom"><Icons.CheckCircle className="text-green-400" /> One team per participant only</li>
              </ul>
            </div>
          </section>

          {/* PAGE 2: TIMELINE (Optimized) */}
          <section className="min-h-screen w-full flex items-center justify-center md:justify-start text-white p-4 md:p-24 snap-center py-16 md:py-24">
            <div className="w-[95%] md:w-1/2 lg:w-5/12 bg-[#0A1128]/80 backdrop-blur-md p-6 md:p-8 rounded-2xl border border-yellow-500/30 shadow-2xl glass-panel">
              <h2 className="text-2xl md:text-4xl font-futura mb-8 text-yellow-400">Event Timeline</h2>
              <div className="relative border-l-2 border-yellow-500/30 pl-6 space-y-6 md:space-y-8">
                <div className="cursor-zoom">
                  <div className="absolute w-3 h-3 bg-cyan-400 rounded-full -left-[7px] mt-1.5 shadow-[0_0_10px_#00E5FF]"></div>
                  <p className="text-xs md:text-sm text-cyan-400 font-futura">10 April · 8:59 pm</p>
                  <h3 className="text-base md:text-xl font-futura">Theme Reveal</h3>
                  <p className="text-gray-400 text-xs md:text-sm mt-1 font-montserrat">Creative window opens immediately.</p>
                </div>
                <div className="cursor-zoom">
                  <div className="absolute w-3 h-3 bg-yellow-400 rounded-full -left-[7px] mt-1.5 shadow-[0_0_10px_#FFD700]"></div>
                  <p className="text-xs md:text-sm text-yellow-400 font-bold font-futura">10 – 13 April</p>
                  <h3 className="text-base md:text-xl font-futura">75-Hour Filmmaking Window</h3>
                  <p className="text-gray-400 text-xs md:text-sm mt-1 font-montserrat">Script, shoot, edit, post-produce. No pre-made material.</p>
                </div>
                <div className="cursor-zoom">
                  <div className="absolute w-3 h-3 bg-red-400 rounded-full -left-[7px] mt-1.5"></div>
                  <p className="text-xs md:text-sm text-red-400 font-bold font-futura">13 April · 11:59 pm</p>
                  <h3 className="text-base md:text-xl font-futura">Submission Deadline</h3>
                  <p className="text-gray-400 text-xs md:text-sm mt-1 font-montserrat">YouTube Unlisted + Google Form link. Late window: +4 hrs.</p>
                </div>
                <div className="cursor-zoom">
                  <div className="absolute w-3 h-3 bg-green-400 rounded-full -left-[7px] mt-1.5"></div>
                  <p className="text-xs md:text-sm text-green-400 font-bold font-futura">16 April</p>
                  <h3 className="text-base md:text-xl font-futura">Screening & Results</h3>
                  <p className="text-gray-400 text-xs md:text-sm mt-1 font-montserrat">Scores revealed transparently at the official screening.</p>
                </div>
              </div>
            </div>
          </section>

          {/* PAGE 3: RULES (Optimized) */}
          <section className="min-h-screen w-full flex items-center justify-center text-white p-2 md:p-8 snap-center py-16 md:py-24">
            <div className="w-[95%] max-w-3xl bg-[#0A1128]/80 backdrop-blur-xl p-4 md:p-8 rounded-2xl border border-white/20 shadow-2xl glass-panel">
              <h2 className="text-xl md:text-3xl font-futura mb-6 text-center text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">Rules & Guidelines</h2>

              <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-6 md:mb-8">
                <button onClick={() => setActiveTab('submission')} className={`px-4 py-2 rounded-full text-[10px] md:text-sm font-futura transition-all ${activeTab === 'submission' ? 'bg-cyan-500 text-black shadow-[0_0_15px_#00E5FF]' : 'bg-white/10 hover:bg-white/20'}`}>Submission</button>
                <button onClick={() => setActiveTab('prohibited')} className={`px-4 py-2 rounded-full text-[10px] md:text-sm font-futura transition-all ${activeTab === 'prohibited' ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-white/10 hover:bg-white/20'}`}>Prohibited</button>
                <button onClick={() => setActiveTab('permitted')} className={`px-4 py-2 rounded-full text-[10px] md:text-sm font-futura transition-all ${activeTab === 'permitted' ? 'bg-green-500 text-white shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-white/10 hover:bg-white/20'}`}>Contextually Permitted</button>
              </div>

              <div className="min-h-[250px]">
                {activeTab === 'submission' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10 cursor-zoom">
                      <Icons.PlaySquare />
                      <div className="space-y-2">
                        <h4 className="font-futura text-sm md:text-base">Format & Requirements</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-[10px] md:text-sm text-gray-400 font-gill">
                          <p>• Duration: 4–7 mins (inc. credits)</p>
                          <p>• Resolution: 1920×1080 (Horizontal)</p>
                          <p>• Upload: YouTube Unlisted</p>
                          <p>• Intro + Credits: Max 30s</p>
                          <p>• Naming: TEAMNAME_FILMTITLE</p>
                          <p>• Submission: Via Official Form</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10 cursor-zoom">
                      <Icons.AlertTriangle />
                      <div>
                        <h4 className="font-futura text-sm md:text-base">Late Policy & Disclaimers</h4>
                        <p className="text-[10px] md:text-sm text-gray-400 mt-1 font-montserrat">Accepted up to 4 hrs post-deadline. Penalty: 2 pts per 10 min. Mandatory disclaimer at start. Explicit disclaimers required for intense themes/violence.</p>
                        <p className="text-[10px] md:text-xs text-yellow-500/80 mt-2 font-futura">All content must be created within the 75-hour window. Plagiarism = disqualification.</p>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'prohibited' && (
                  <div className="space-y-3 animate-fade-in">
                    {['Plagiarism or pre-existing footage', 'AI-generated clips, scenes, or scripts', 'Graphic gore or extreme violence', 'Glorification of drugs or substance abuse', 'Stock footage', 'Hate speech or communal provocation', 'Targeting religion, caste, gender, or race'].map((rule, i) => (
                      <div key={i} className="flex items-start gap-3 text-red-300 text-[10px] md:text-sm p-3 bg-red-900/20 rounded border border-red-500/20 cursor-zoom font-gill">
                        <span className="text-red-500 font-bold leading-none mt-0.5">×</span> <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'permitted' && (
                  <div className="space-y-3 animate-fade-in">
                    {['Mild violence integral to the narrative', 'Sensitive dialogue used responsibly', 'Social commentary on difficult themes', 'Mild romantic interactions, handled respectfully', 'Extreme sequences depicted artistically, not visually'].map((rule, i) => (
                      <div key={i} className="flex items-start gap-3 text-green-300 text-[10px] md:text-sm p-3 bg-green-900/20 rounded border border-green-500/20 cursor-zoom font-gill">
                        <Icons.CheckCircle className="text-green-500 shrink-0 mt-0.5" /> <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* PAGE 4: JUDGING (Optimized) */}
          <section className="min-h-screen w-full flex items-center justify-center text-white p-2 md:p-8 snap-center py-6 md:py-10">
            <div className="w-[95%] md:w-full max-w-6xl flex flex-col md:flex-row gap-6 md:gap-10">
              <div className="w-full md:w-5/12 flex flex-col justify-center bg-gradient-to-br from-yellow-600/30 to-[#0A1128]/80 p-6 md:p-8 rounded-[2rem] border border-yellow-500/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
                {/* Background Ornament */}
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-yellow-500/10 blur-3xl rounded-full"></div>

                <div className="relative z-10 text-center mb-6">
                  <span className="text-cyan-400 font-black uppercase tracking-[0.3em] text-[10px] block mb-1 opacity-80">Total Prize Pool</span>
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-[1px] w-6 bg-gradient-to-r from-transparent to-yellow-500/50"></div>
                    <h2 className="text-5xl md:text-6xl font-serif italic font-black text-yellow-500 drop-shadow-[0_4px_12px_rgba(234,179,8,0.4)] tracking-tighter">60k+</h2>
                    <div className="h-[1px] w-6 bg-gradient-to-l from-transparent to-yellow-500/50"></div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all group/item cursor-zoom">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center text-yellow-400 border border-yellow-400/30 group-hover/item:scale-110 transition-transform">
                        <Icons.Trophy size={16} />
                      </div>
                      <span className="text-gray-200 text-[10px] sm:text-xs font-black uppercase tracking-wider">Grand Winner</span>
                    </div>
                    <span className="font-black text-lg text-yellow-500 drop-shadow-sm">₹ 25,000</span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all group/item cursor-zoom">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300/20 flex items-center justify-center text-gray-300 border border-gray-300/30 group-hover/item:scale-110 transition-transform">
                        <Icons.Medal size={16} />
                      </div>
                      <span className="text-gray-300 text-[10px] sm:text-xs font-black uppercase tracking-wider">Runner Up</span>
                    </div>
                    <span className="font-black text-lg text-gray-300 drop-shadow-sm">₹ 12,500</span>
                  </div>

                  <div className="flex justify-between items-center bg-white/5 p-2.5 rounded-xl border border-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all group/item cursor-zoom">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-400/20 flex items-center justify-center text-orange-400 border border-orange-400/30 group-hover/item:scale-110 transition-transform">
                        <Icons.Award size={16} />
                      </div>
                      <span className="text-gray-400 text-[10px] sm:text-xs font-black uppercase tracking-wider">2nd Runner Up</span>
                    </div>
                    <span className="font-black text-lg text-orange-400 drop-shadow-sm">₹ 7,500</span>
                  </div>
                </div>

                <h4 className="text-[9px] uppercase tracking-[0.2em] text-cyan-400/80 mb-4 font-black flex items-center gap-3">
                  <span className="h-[1px] flex-1 bg-cyan-400/20"></span>
                  Domain Excellence Awards
                  <span className="h-[1px] flex-1 bg-cyan-400/20"></span>
                </h4>

                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                  {["Best Acting Performance", "Best Direction", "Best Editing", "Best Cinematography", "Best Film of CRCE"].map((label) => (
                    <span key={label} className="px-3 py-1.5 md:px-5 md:py-2 bg-cyan-500/10 border border-cyan-400/30 rounded-full text-cyan-300 text-[9px] md:text-xs font-bold uppercase tracking-[0.2em] cursor-zoom hover:bg-cyan-400 hover:text-black transition-all">
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="w-full md:w-2/3 bg-[#0A1128]/80 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-cyan-500/30 glass-panel md:max-h-[850px] md:overflow-y-auto">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-base md:text-xl font-bold text-cyan-400 uppercase tracking-tighter font-futura cursor-zoom">Judging Criteria</h3>
                  <span className="text-yellow-400 font-black text-xs md:text-base border-b-2 border-yellow-400/50 font-futura cursor-zoom">200 PTS TOTAL</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4">
                  {[
                    { name: 'Storytelling & Narrative', desc: 'Clarity of plot, structure, pacing, audience connection' },
                    { name: 'Theme Interpretation', desc: 'Effectiveness and depth in exploring the assigned theme' },
                    { name: 'Screenplay & Scene Structure', desc: 'Writing quality, dialogue, scene construction, narrative flow' },
                    { name: 'Direction', desc: 'Creative vision, execution, overall coherence' },
                    { name: 'Cinematography', desc: 'Framing, lighting, camera work, visual aesthetics' },
                    { name: 'Editing & Pacing', desc: 'Rhythm, transitions, continuity, narrative smoothness' },
                    { name: 'Acting & Performance', desc: 'Authenticity, emotional depth, character portrayal' },
                    { name: 'Sound Design', desc: 'Background score, sound effects, clarity, audio integration' },
                    { name: 'Creativity & Originality', desc: 'Innovation, uniqueness of concept, fresh storytelling' },
                    { name: 'Overall Impact', desc: 'Emotional resonance, memorability, lasting impression' },
                  ].map((crit, i) => (
                    <div key={i} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors shadow-lg cursor-zoom gap-3 sm:gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-xs sm:text-sm md:text-base uppercase leading-tight text-white mb-0.5 font-montserrat">{crit.name}</h4>
                        <p className="text-[10px] sm:text-[11px] md:text-xs text-gray-400/90 leading-tight font-montserrat">{crit.desc}</p>
                      </div>
                      <span className="text-yellow-400 font-mono text-[10px] sm:text-sm bg-yellow-400/10 px-3 py-1 rounded-full whitespace-nowrap border border-yellow-400/20 font-black shadow-inner self-end sm:self-center">20 pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* PAGE 5: FOOTER */}
          <section className="min-h-screen w-full flex flex-col justify-end items-center text-white p-4 md:p-8 pb-8 md:pb-16 snap-center py-16 md:py-24">
            <div className="w-[95%] max-w-4xl bg-black/50 backdrop-blur-xl p-6 md:p-8 rounded-3xl border border-white/10 text-center flex flex-col items-center glass-panel max-h-none md:max-h-[85vh] md:overflow-y-auto">
              <h2 className="text-xl md:text-3xl font-black mb-6 tracking-widest text-white/80 uppercase">See you at the screening</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 md:gap-12 w-full mb-10 text-[10px] md:text-sm">
                <div>
                  <h4 className="text-cyan-400 font-black mb-3 uppercase tracking-[0.3em] text-[12px] md:text-[14px] font-futura border-b border-cyan-400/20 pb-1">Location</h4>
                  <p className="text-gray-400 leading-relaxed text-xs md:text-sm font-montserrat cursor-zoom">Samvad Auditorium, Fr. CRCE<br />Bandra (W), Mumbai — 050</p>
                </div>
                <div>
                  <h4 className="text-yellow-400 font-black mb-3 uppercase tracking-[0.3em] text-[12px] md:text-[14px] font-futura border-b border-yellow-400/20 pb-1">Public Relations</h4>
                  <div className="space-y-4 text-gray-400 text-xs md:text-sm font-montserrat cursor-zoom">
                    <p className="flex flex-col sm:block">
                      <span>Samruddhi Kanade:</span> <span className="whitespace-nowrap">+91 91373 66520</span>
                    </p>
                    <p className="flex flex-col sm:block">
                      <span>Abner Almeida:</span> <span className="whitespace-nowrap">+91 77100 50829</span>
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="text-yellow-400 font-black mb-3 uppercase tracking-[0.3em] text-[12px] md:text-[14px] font-futura border-b border-yellow-400/20 pb-1">Presidents</h4>
                  <div className="space-y-2 text-gray-400 text-xs md:text-sm font-montserrat cursor-zoom">
                    <p>Vishwaa Bhende: +91 93248 29365</p>
                    <p>Yugank Mahale: +91 93220 55416</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                <a href="mailto:filmsocietycrce@gmail.com" className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full font-semibold transition-all text-xs w-full sm:w-auto">Email Us</a>
                <a href="https://cine-crce.vercel.app/CineCRCE%20-%20Shortfilm%20Competition.pdf" target="_blank" rel="noreferrer" className="px-6 py-3 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-400 hover:text-black border border-cyan-400/50 rounded-full font-semibold transition-all text-xs w-full sm:w-auto">Brochure PDF</a>
              </div>

              <p className="text-[8px] md:text-xs text-white/80 mt-8 max-w-2xl leading-relaxed">
                Organizing Committee decisions are final. Non-exclusive screening rights granted for festival promotion.
              </p>

              <div className="w-full border-t border-white/5 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs md:text-sm text-gray-400 font-medium tracking-tight">
                <p>© 2026 CineCRCE. All rights reserved.</p>
                <a
                  href="https://www.instagram.com/finvest_frcrce?igsh=NHlhdGE1NTQ0em43"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-4 hover:text-cyan-400 transition-colors group"
                >
                  <img src={getAssetUrl('bull_white.png')} alt="" className="h-10 md:h-14 opacity-90 object-contain" />
                  <p className="text-gray-500 font-black tracking-tighter uppercase text-[10px] md:text-xs group-hover:text-cyan-400 transition-colors">
                    MADE BY FINVEST ~ CRCE’S FINANCE COUNCIL
                  </p>
                  <img src={getAssetUrl('logo.png')} alt="" className="h-8 md:h-10 opacity-70 ml-1 object-contain" onError={(e) => e.target.style.display = 'none'} />
                </a>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div >
  );
}

// Export the app wrapped in the ErrorBoundary
export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <App />
      <Analytics />
    </ErrorBoundary>
  );
}