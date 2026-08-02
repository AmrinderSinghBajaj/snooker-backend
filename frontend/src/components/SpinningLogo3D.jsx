import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useBranding } from '../context/BrandingContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

export default function SpinningLogo3D({ size = 180 }) {
  const containerRef = useRef(null);
  const { logo_url, has_logo, club_name } = useBranding();

  // Keep references to the materials so we can update their textures dynamically
  const faceMatFrontRef = useRef(null);
  const faceMatBackRef = useRef(null);

  // 1. WebGL Initialization (only runs on mount or if size changes)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.z = 6.5;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false, // prevents white fringing at transparent alpha edges
    });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(4, 6, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xe3c878, 0.6); // warm brass fill
    fill.position.set(-5, -2, 3);
    scene.add(fill);

    const coinGroup = new THREE.Group();
    scene.add(coinGroup);

    const RADIUS = 2;
    const DEPTH  = 0.18;

    const coinGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, DEPTH, 64, 1);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, metalness: 0.95, roughness: 0.10,
    });
    const faceMatFront = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.1, roughness: 0.35,
    });
    const faceMatBack = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.1, roughness: 0.35,
    });

    faceMatFrontRef.current = faceMatFront;
    faceMatBackRef.current = faceMatBack;

    const coinMesh = new THREE.Mesh(coinGeo, [rimMat, faceMatFront, faceMatBack]);
    coinMesh.rotation.x = Math.PI / 2;
    coinGroup.add(coinMesh);

    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      coinGroup.rotation.y += 0.013;
      coinGroup.position.y  = Math.sin(Date.now() * 0.0014) * 0.1;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      coinGeo.dispose();
      rimMat.dispose();
      faceMatFront.dispose();
      faceMatBack.dispose();
      renderer.dispose();
      faceMatFrontRef.current = null;
      faceMatBackRef.current = null;
    };
  }, [size]);

  // 2. Texture Loading (runs when branding loads or changes)
  useEffect(() => {
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

      const matFront = faceMatFrontRef.current;
      const matBack = faceMatBackRef.current;

      if (matFront) {
        if (matFront.map) matFront.map.dispose();
        matFront.map = makeCapTexture(srcCanvas, false);
        matFront.needsUpdate = true;
      }
      if (matBack) {
        if (matBack.map) matBack.map.dispose();
        matBack.map = makeCapTexture(srcCanvas, true);
        matBack.needsUpdate = true;
      }
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
  }, [logo_url, has_logo, club_name]);

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
