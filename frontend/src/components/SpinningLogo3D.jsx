import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useBranding } from '../context/BrandingContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:5000`;

export default function SpinningLogo3D({ size = 180 }) {
  const containerRef = useRef(null);
  const { logo_url, has_logo, club_name } = useBranding();

  useEffect(() => {
    if (!containerRef.current) return;

    // ── Scene / Camera / Renderer ────────────────────────────────────────────
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
    containerRef.current.appendChild(renderer.domElement);

    // ── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));

    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(4, 6, 5);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xe3c878, 0.6); // warm brass fill
    fill.position.set(-5, -2, 3);
    scene.add(fill);

    // ── Coin geometry ────────────────────────────────────────────────────────
    const RADIUS = 2;
    const DEPTH  = 0.18;

    const coinGroup = new THREE.Group();
    scene.add(coinGroup);

    // Single solid CylinderGeometry — no separate rim/face seam to cause artifacts
    // Material order: [side=rim, top=front-face, bottom=back-face]
    const coinGeo = new THREE.CylinderGeometry(RADIUS, RADIUS, DEPTH, 128, 1);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37, metalness: 0.95, roughness: 0.10,
    });
    const faceMatFront = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.1, roughness: 0.35,
    });
    const faceMatBack = new THREE.MeshStandardMaterial({
      color: 0xffffff, metalness: 0.1, roughness: 0.35,
    });
    const coinMesh = new THREE.Mesh(coinGeo, [rimMat, faceMatFront, faceMatBack]);
    // Lay coin flat so caps face forward/backward (+Z / -Z)
    coinMesh.rotation.x = Math.PI / 2;
    coinGroup.add(coinMesh);

    // ── Texture helpers ──────────────────────────────────────────────────────
    let texFront = null;
    let texBack  = null;

    const applyTextures = (srcCanvas) => {
      const s = srcCanvas.width;

      // CylinderGeometry cap UV: vertex at angle θ → UV (cos(θ)*0.5+0.5, sin(θ)*0.5+0.5)
      // This is the same mapping as CircleGeometry.
      // With CanvasTexture flipY=true (default): canvas-top(Y=0) → UV V=1 → cap top.
      // Texture needs 90° rotation to appear upright on the cap.
      const makeCapTexture = (canvasSrc, mirrorH) => {
        const tmp = document.createElement('canvas');
        tmp.width = tmp.height = s;
        const c = tmp.getContext('2d');
        c.translate(s / 2, s / 2);
        if (mirrorH) c.scale(-1, 1);          // mirror for back face
        c.rotate(-Math.PI / 2);               // -90° corrects CylinderGeometry cap UV
        c.drawImage(canvasSrc, -s / 2, -s / 2, s, s);
        const tex = new THREE.CanvasTexture(tmp);
        tex.colorSpace = THREE.SRGBColorSpace;
        return tex;
      };

      texFront = makeCapTexture(srcCanvas, false);
      faceMatFront.map = texFront;
      faceMatFront.needsUpdate = true;

      texBack = makeCapTexture(srcCanvas, true);
      faceMatBack.map = texBack;
      faceMatBack.needsUpdate = true;
    };

    /**
     * Build a canvas containing the logo image zoomed/fitted so the clean
     * circular badge content fills the face perfectly.
     */
    const buildLogoCanvas = (img) => {
      const w = img.width;
      const h = img.height;
      const aspect = w / h;

      const s = 512;
      const canvas = document.createElement('canvas');
      canvas.width  = s;
      canvas.height = s;
      const ctx = canvas.getContext('2d');

      // Clip to a perfect circle — this is the coin face boundary
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, s / 2, 0, Math.PI * 2);
      ctx.clip();

      // Based on visual inspection, the circular badge is 88% of the height of the image.
      // We scale the image so that the badge fits the 512x512 canvas perfectly.
      const badgeDiameterInImageHeight = 0.88;
      const targetHeight = s / badgeDiameterInImageHeight;
      const targetWidth = targetHeight * aspect;

      // Draw centered
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
      const s = 512;
      const canvas = document.createElement('canvas');
      canvas.width  = s;
      canvas.height = s;
      const ctx = canvas.getContext('2d');

      // Felt green background
      const grad = ctx.createRadialGradient(s/2, s/2, 40, s/2, s/2, s/2);
      grad.addColorStop(0, '#1b5c4c');
      grad.addColorStop(1, '#0b2b22');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s/2, s/2, s/2, 0, Math.PI * 2);
      ctx.fill();

      // Brass ring
      ctx.strokeStyle = '#c9a24b';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.arc(s/2, s/2, s/2 - 20, 0, Math.PI * 2);
      ctx.stroke();

      // Initial letter
      const initial = club_name?.charAt(0) || 'B';
      ctx.fillStyle = '#e3c878';
      ctx.font = `bold ${s * 0.48}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initial, s/2, s/2);

      return canvas;
    };

    // ── Load logo ────────────────────────────────────────────────────────────
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

    // ── Animation ────────────────────────────────────────────────────────────
    let raf;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      coinGroup.rotation.y += 0.013;
      coinGroup.position.y  = Math.sin(Date.now() * 0.0014) * 0.1;
      renderer.render(scene, camera);
    };
    animate();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      if (renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      coinGeo.dispose(); rimMat.dispose();
      faceMatFront.dispose(); faceMatBack.dispose();
      if (texFront) texFront.dispose();
      if (texBack)  texBack.dispose();
      renderer.dispose();
    };
  }, [logo_url, has_logo, club_name, size]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',     // CSS-clips canvas to a perfect circle
        overflow: 'hidden',       // hides any edge artifacts outside the circle
        filter: 'drop-shadow(0 12px 24px rgba(11, 43, 34, 0.55))',
      }}
    />
  );
}
