import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useBranding } from '../context/BrandingContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

// Shared module-level WebGL resources to prevent context exhaustion
let sharedRenderer = null;
let sharedScene = null;
let sharedCamera = null;
let sharedCoinGroup = null;
let sharedCoinGeo = null;
let sharedRimMat = null;
let sharedFaceMatFront = null;
let sharedFaceMatBack = null;
let sharedCoinMesh = null;

// Track the active component instance ID to manage the animation loop correctly
let currentAnimatingInstance = null;

function initSharedThree(size) {
  if (sharedRenderer) return;

  sharedScene = new THREE.Scene();
  sharedCamera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  sharedCamera.position.z = 6.5;

  sharedRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    premultipliedAlpha: false, // prevents white fringing at transparent alpha edges
  });
  sharedRenderer.setSize(size, size);
  sharedRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Lights
  sharedScene.add(new THREE.AmbientLight(0xffffff, 0.9));

  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(4, 6, 5);
  sharedScene.add(key);

  const fill = new THREE.DirectionalLight(0xe3c878, 0.6); // warm brass fill
  fill.position.set(-5, -2, 3);
  sharedScene.add(fill);

  // Coin group
  sharedCoinGroup = new THREE.Group();
  sharedScene.add(sharedCoinGroup);

  const RADIUS = 2;
  const DEPTH  = 0.18;

  sharedCoinGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, DEPTH, 64, 1);
  sharedRimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37, metalness: 0.95, roughness: 0.10,
  });
  sharedFaceMatFront = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 0.1, roughness: 0.35,
  });
  sharedFaceMatBack = new THREE.MeshStandardMaterial({
    color: 0xffffff, metalness: 0.1, roughness: 0.35,
  });

  sharedCoinMesh = new THREE.Mesh(sharedCoinGeo, [sharedRimMat, sharedFaceMatFront, sharedFaceMatBack]);
  sharedCoinMesh.rotation.x = Math.PI / 2;
  sharedCoinGroup.add(sharedCoinMesh);
}

export default function SpinningLogo3D({ size = 48 }) {
  const containerRef = useRef(null);
  const { logo_url, has_logo, club_name } = useBranding();

  useEffect(() => {
    // 1. Initialise shared WebGL resources
    initSharedThree(size);

    // 2. Dynamically resize renderer and camera to match this instance's size
    if (sharedRenderer) {
      sharedRenderer.setSize(size, size);
    }
    if (sharedCamera) {
      sharedCamera.aspect = 1;
      sharedCamera.updateProjectionMatrix();
    }

    const container = containerRef.current;
    if (!container) return;

    // 3. Attach shared canvas
    container.appendChild(sharedRenderer.domElement);

    // 4. Texture mapping and helper canvas
    const applyTextures = (srcCanvas) => {
      const s = srcCanvas.width;

      const makeCapTexture = (canvasSrc, isBack) => {
        const tmp = document.createElement('canvas');
        tmp.width = tmp.height = s;
        const ctx = tmp.getContext('2d');
        ctx.translate(s / 2, s / 2);
        if (isBack) {
          ctx.scale(-1, 1);
          ctx.rotate(Math.PI / 2);
        } else {
          ctx.rotate(-Math.PI / 2);
        }
        ctx.drawImage(canvasSrc, -s / 2, -s / 2, s, s);
        const tex = new THREE.CanvasTexture(tmp);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      };

      // Dispose of existing textures to free memory
      if (sharedFaceMatFront.map) sharedFaceMatFront.map.dispose();
      if (sharedFaceMatBack.map) sharedFaceMatBack.map.dispose();

      const texFront = makeCapTexture(srcCanvas, false);
      sharedFaceMatFront.map = texFront;
      sharedFaceMatFront.needsUpdate = true;

      const texBack = makeCapTexture(srcCanvas, true);
      sharedFaceMatBack.map = texBack;
      sharedFaceMatBack.needsUpdate = true;
    };

    const buildLogoCanvas = (img) => {
      const w = img.width;
      const h = img.height;
      const aspect = w / h;

      const s = 256;
      const canvas = document.createElement('canvas');
      canvas.width  = s;
      canvas.height = s;
      const ctx = canvas.getContext('2d');

      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.clip();

      const style = getComputedStyle(document.documentElement);
      const felt700 = style.getPropertyValue('--felt-700').trim() || '#1b5c4c';
      const felt900 = style.getPropertyValue('--felt-900').trim() || '#0b2b22';

      const grad = ctx.createRadialGradient(s / 2, s / 2, 20, s / 2, s / 2, s / 2);
      grad.addColorStop(0, felt700);
      grad.addColorStop(1, felt900);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.fill();

      let targetWidth, targetHeight;
      if (aspect > 1) {
        targetHeight = s;
        targetWidth = s * aspect;
      } else {
        targetWidth = s;
        targetHeight = s / aspect;
      }

      ctx.drawImage(
        img,
        (s - targetWidth) / 2,
        (s - targetHeight) / 2,
        targetWidth,
        targetHeight
      );

      return canvas;
    };

    const buildFallbackCanvas = () => {
      const s = 256;
      const canvas = document.createElement('canvas');
      canvas.width  = s;
      canvas.height = s;
      const ctx = canvas.getContext('2d');

      const style = getComputedStyle(document.documentElement);
      const felt700 = style.getPropertyValue('--felt-700').trim() || '#1b5c4c';
      const felt900 = style.getPropertyValue('--felt-900').trim() || '#0b2b22';

      const grad = ctx.createRadialGradient(s/2, s/2, 20, s/2, s/2, s/2);
      grad.addColorStop(0, felt700);
      grad.addColorStop(1, felt900);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s/2, s/2, s/2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#c9a24b';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(s/2, s/2, s/2 - 10, 0, Math.PI * 2);
      ctx.stroke();

      const initial = club_name?.charAt(0) || 'B';
      ctx.fillStyle = '#e3c878';
      ctx.font = `bold ${s * 0.48}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, s/2, s/2 + 2);

      return canvas;
    };

    const logoUrl = has_logo && logo_url ? `${API_BASE_URL}${logo_url}` : null;
    if (logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload  = () => applyTextures(buildLogoCanvas(img));
      img.onerror = () => applyTextures(buildFallbackCanvas());
      img.src = logoUrl;
    } else {
      applyTextures(buildFallbackCanvas());
    }

    // 5. Manage animation loop
    const instanceId = Math.random();
    currentAnimatingInstance = instanceId;

    let raf;
    const animate = () => {
      if (currentAnimatingInstance !== instanceId) return; // Prevent concurrent multiple loops
      raf = requestAnimationFrame(animate);
      sharedCoinGroup.rotation.y += 0.013;
      sharedCoinGroup.position.y  = Math.sin(Date.now() * 0.0014) * 0.1;
      sharedRenderer.render(sharedScene, sharedCamera);
    };
    animate();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      if (sharedRenderer.domElement.parentNode === container) {
        container.removeChild(sharedRenderer.domElement);
      }
    };
  }, [logo_url, has_logo, club_name, size]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        overflow: 'hidden',
        filter: 'drop-shadow(0 4px 8px rgba(11, 43, 34, 0.4))',
      }}
    />
  );
}
