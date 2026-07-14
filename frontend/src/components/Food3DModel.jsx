import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export function getCategory(name = '') {
  const lowercase = name.toLowerCase();
  if (lowercase.includes('tea') || lowercase.includes('chai')) return 'tea';
  if (lowercase.includes('coffee') || lowercase.includes('coffe') || lowercase.includes('cofe') || lowercase.includes('espresso') || lowercase.includes('cappuccino') || lowercase.includes('latte')) return 'coffee';
  if (lowercase.includes('maggi') || lowercase.includes('noodle') || lowercase.includes('ramen') || lowercase.includes('pasta')) return 'maggi';
  if (lowercase.includes('bread') || lowercase.includes('roti') || lowercase.includes('naan') || lowercase.includes('chapati') || lowercase.includes('paratha')) return 'bread';
  if (lowercase.includes('water') || lowercase.includes('bottle')) return 'water';
  if (lowercase.includes('sandwich') || lowercase.includes('sandwitch') || lowercase.includes('burger')) return 'sandwich';
  if (lowercase.includes('coke') || lowercase.includes('cola') || lowercase.includes('sprite') || lowercase.includes('pepsi') || lowercase.includes('fanta') || lowercase.includes('drink') || lowercase.includes('soda') || lowercase.includes('juice')) return 'coke';
  if (lowercase.includes('fries') || lowercase.includes('fry') || lowercase.includes('french fries') || lowercase.includes('potato')) return 'fries';
  return 'default';
}

export default function Food3DModel({ name }) {
  const mountRef = useRef(null);
  const hoverRef = useRef(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    hoverRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth || 160;
    const H = mount.clientHeight || 110;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 100);
    camera.position.set(0, 0.7, 1.2);
    camera.lookAt(0, 0.05, 0);

    // ── Fake HDRI Studio environment ──────────────────────────────────────────
    const envSize = 64;
    const faces = ['px','nx','py','ny','pz','nz'];
    const cubeData = faces.map((face) => {
      const c = document.createElement('canvas');
      c.width = c.height = envSize;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, envSize);
      if (face === 'py') {
        g.addColorStop(0, '#fff5e8');
        g.addColorStop(1, '#ffe8c0');
      } else if (face === 'ny') {
        g.addColorStop(0, '#0a1a14');
        g.addColorStop(1, '#0a1a14');
      } else {
        g.addColorStop(0, '#0f2c22');
        g.addColorStop(1, '#0b1d17');
      }
      x.fillStyle = g;
      x.fillRect(0, 0, envSize, envSize);
      return c;
    });
    const envTexture = new THREE.CubeTexture(cubeData.map((c) => c));
    envTexture.needsUpdate = true;
    scene.environment = envTexture;

    // ── Lights ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xfff5e8, 0.5));

    const key = new THREE.SpotLight(0xffffff, 2.5);
    key.position.set(1, 3, 2);
    key.angle = 0.5;
    key.penumbra = 0.5;
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0xb8d9ff, 0.6);
    fill.position.set(-2, 1, 1);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xffe2bd, 0.8);
    rim.position.set(1, 1, -2);
    scene.add(rim);

    // ── Root Group ────────────────────────────────────────────────────────────
    const root = new THREE.Group();
    scene.add(root);

    // ── Materials ──────────────────────────────────────────────────────────────
    const physical = (params) => new THREE.MeshPhysicalMaterial(params);
    const standard = (params) => new THREE.MeshStandardMaterial(params);

    const category = getCategory(name);

    // ────────────────────────────────────────────────────────────────────────
    //  3D MODEL BUILDERS
    // ────────────────────────────────────────────────────────────────────────

    // 1. TEA (milky tea in a glass cup)
    const buildTea = () => {
      const g = new THREE.Group();
      
      // Glass cup
      const glassMat = physical({
        color: 0xffffff,
        roughness: 0.05,
        transmission: 0.9,
        ior: 1.5,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      });
      const glassGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.28, 24, 1, true);
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.y = 0.14;
      g.add(glass);

      // Glass bottom base
      const baseGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.03, 24);
      const base = new THREE.Mesh(baseGeo, glassMat);
      base.position.y = 0.015;
      g.add(base);

      // Tea Liquid
      const liquidMat = physical({
        color: 0xc49a75, // tea light brown
        roughness: 0.2,
        clearcoat: 0.5,
      });
      const liquidGeo = new THREE.CylinderGeometry(0.11, 0.085, 0.22, 20);
      const liquid = new THREE.Mesh(liquidGeo, liquidMat);
      liquid.position.y = 0.125;
      g.add(liquid);

      return g;
    };

    // 2. COFFEE (red ceramic mug + foam)
    const buildCoffee = () => {
      const g = new THREE.Group();

      const mugMat = physical({
        color: 0xd32f2f, // red mug
        roughness: 0.1,
        clearcoat: 0.8,
      });

      // Mug body
      const bodyGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.25, 24);
      const body = new THREE.Mesh(bodyGeo, mugMat);
      body.position.y = 0.125;
      body.castShadow = true;
      g.add(body);

      // Handle
      const handleGeo = new THREE.TorusGeometry(0.08, 0.024, 12, 24, Math.PI);
      const handle = new THREE.Mesh(handleGeo, mugMat);
      handle.position.set(0.13, 0.125, 0);
      handle.rotation.z = -Math.PI / 2;
      g.add(handle);

      // Coffee Liquid
      const coffeeMat = physical({ color: 0x3e2723, roughness: 0.2 });
      const liquidGeo = new THREE.CylinderGeometry(0.118, 0.118, 0.01, 20);
      const liquid = new THREE.Mesh(liquidGeo, coffeeMat);
      liquid.position.y = 0.235;
      g.add(liquid);

      // Froth/cream circles
      const foamMat = standard({ color: 0xeed9c4, roughness: 0.8 });
      for (let i = 0; i < 5; i++) {
        const foam = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), foamMat);
        const theta = (i / 5) * Math.PI * 2;
        const r = 0.05 + Math.random() * 0.02;
        foam.position.set(Math.cos(theta) * r, 0.24, Math.sin(theta) * r);
        foam.scale.set(1.2, 0.2, 1.2);
        g.add(foam);
      }

      return g;
    };

    // 3. MAGGI (yellow bowl + wavy yellow noodles)
    const buildMaggi = () => {
      const g = new THREE.Group();

      // Yellow Bowl
      const bowlMat = physical({
        color: 0xfbc02d,
        roughness: 0.15,
        clearcoat: 0.8,
      });
      const bowlPoints = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10;
        bowlPoints.push(new THREE.Vector2(0.06 + t * 0.16, t * 0.15));
      }
      const bowlGeo = new THREE.LatheGeometry(bowlPoints, 24);
      const bowl = new THREE.Mesh(bowlGeo, bowlMat);
      bowl.castShadow = true;
      g.add(bowl);

      // Soup
      const soupMat = physical({ color: 0xd35400, roughness: 0.3 });
      const soupGeo = new THREE.CylinderGeometry(0.20, 0.12, 0.01, 20);
      const soup = new THREE.Mesh(soupGeo, soupMat);
      soup.position.y = 0.11;
      g.add(soup);

      // Wavy Noodles (Spiral wave path)
      const nPoints = [];
      for (let i = 0; i < 180; i++) {
        const theta = i * 0.35;
        const r = (i / 180) * 0.18;
        const y = 0.11 + Math.sin(i * 1.6) * 0.018;
        nPoints.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
      }
      const curve = new THREE.CatmullRomCurve3(nPoints);
      const noodleGeo = new THREE.TubeGeometry(curve, 120, 0.009, 5, false);
      const noodleMat = standard({ color: 0xfbc02d, roughness: 0.5 });
      const noodles = new THREE.Mesh(noodleGeo, noodleMat);
      g.add(noodles);

      // Garnish (peas & carrot cubes)
      const peaMat = standard({ color: 0x4caf50, roughness: 0.6 });
      const carrotMat = standard({ color: 0xff5722, roughness: 0.6 });
      for (let i = 0; i < 8; i++) {
        const isCarrot = Math.random() > 0.5;
        const mesh = isCarrot 
          ? new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.02), carrotMat)
          : new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), peaMat);
        
        const r = Math.random() * 0.13 + 0.02;
        const theta = Math.random() * Math.PI * 2;
        mesh.position.set(Math.cos(theta) * r, 0.13, Math.sin(theta) * r);
        g.add(mesh);
      }

      return g;
    };

    // 4. FLOUR BREAD (Plate + Indian flatbread with brown toasted spots)
    const buildBread = () => {
      const g = new THREE.Group();

      // Plate
      const plateMat = physical({ color: 0xffffff, roughness: 0.1, clearcoat: 0.9 });
      const platePoints = [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.24, 0),
        new THREE.Vector2(0.25, 0.02),
        new THREE.Vector2(0.26, 0.03),
        new THREE.Vector2(0, 0.03)
      ];
      const plate = new THREE.Mesh(new THREE.LatheGeometry(platePoints, 32), plateMat);
      plate.receiveShadow = true;
      g.add(plate);

      // Canvas for bread textures (beige base + toasted brown/black circles)
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#dfba87';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = Math.random() > 0.3 ? '#7c5329' : '#3d2008';
        ctx.globalAlpha = Math.random() * 0.6 + 0.2;
        ctx.beginPath();
        ctx.arc(Math.random() * 128, Math.random() * 128, Math.random() * 6 + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      const tex = new THREE.CanvasTexture(canvas);
      const breadMat = physical({ map: tex, roughness: 0.85 });

      // Flatbread Mesh with organic waviness
      const breadGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.008, 32, 2);
      const pos = breadGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        pos.setY(i, pos.getY(i) + Math.sin(x * 14) * Math.cos(z * 14) * 0.014);
      }
      breadGeo.computeVertexNormals();

      const bread = new THREE.Mesh(breadGeo, breadMat);
      bread.position.y = 0.024;
      bread.rotation.y = Math.random() * 2;
      bread.castShadow = true;
      g.add(bread);

      return g;
    };

    // 5. WATER BOTTLE (blue plastic ribbed body + cap)
    const buildWaterBottle = () => {
      const g = new THREE.Group();

      const bottleMat = physical({
        color: 0x82d4ff,
        roughness: 0.12,
        transmission: 0.9,
        ior: 1.33,
        transparent: true,
        opacity: 0.5,
        clearcoat: 0.5,
      });

      // Plastic ribbed bottle shape profile
      const pts = [new THREE.Vector2(0, 0), new THREE.Vector2(0.065, 0)];
      for (let y = 0.02; y < 0.22; y += 0.025) {
        pts.push(new THREE.Vector2(0.065, y));
        pts.push(new THREE.Vector2(0.060, y + 0.008));
        pts.push(new THREE.Vector2(0.065, y + 0.016));
      }
      pts.push(new THREE.Vector2(0.065, 0.23));
      pts.push(new THREE.Vector2(0.045, 0.27));
      pts.push(new THREE.Vector2(0.022, 0.285));
      pts.push(new THREE.Vector2(0.022, 0.32));
      pts.push(new THREE.Vector2(0, 0.32));

      const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), bottleMat);
      body.castShadow = true;
      g.add(body);

      // Water liquid inside
      const waterMat = physical({ color: 0xbfe7ff, roughness: 0.05, transmission: 0.92, transparent: true, opacity: 0.7 });
      const waterGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.20, 16);
      const water = new THREE.Mesh(waterGeo, waterMat);
      water.position.y = 0.11;
      g.add(water);

      // Cap
      const capMat = physical({ color: 0x004ad2, roughness: 0.2 });
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.022, 14), capMat);
      cap.position.y = 0.33;
      g.add(cap);

      g.position.y = -0.1;

      return g;
    };

    // 6. SANDWICH (triangular bread slices with green and red layers)
    const buildSandwich = () => {
      const g = new THREE.Group();

      // Triangular slice shape path
      const s = new THREE.Shape();
      s.moveTo(-0.15, -0.12);
      s.lineTo(0.15, -0.12);
      s.lineTo(-0.15, 0.12);
      s.closePath();

      const extrudeSettings = {
        depth: 0.034,
        bevelEnabled: true,
        bevelThickness: 0.008,
        bevelSize: 0.005,
        bevelSegments: 2
      };

      const breadMat = physical({ color: 0xeedeb9, roughness: 0.8 }); // wheat bread
      const crustMat = physical({ color: 0x8d5c32, roughness: 0.6 });

      const breadGeo = new THREE.ExtrudeGeometry(s, extrudeSettings);

      // Bottom slice
      const bread1 = new THREE.Mesh(breadGeo, [breadMat, crustMat]);
      bread1.castShadow = true;
      g.add(bread1);

      // Top slice
      const bread2 = bread1.clone();
      bread2.position.z = 0.06;
      g.add(bread2);

      // Tomato slice (Red Cylinder)
      const tomatoMat = physical({ color: 0xd32f2f, roughness: 0.15 });
      const tomato = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.022, 10), tomatoMat);
      tomato.position.set(-0.06, 0.02, 0.045);
      tomato.rotation.set(Math.PI/2, 0.2, 0);
      g.add(tomato);

      // Cheese slice (Yellow flat Box)
      const cheeseMat = standard({ color: 0xffeb3b, roughness: 0.5 });
      const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.008), cheeseMat);
      cheese.position.set(-0.04, -0.02, 0.045);
      cheese.rotation.set(0.1, 0, 0.4);
      g.add(cheese);

      // Lettuce leaf (Green flat Box)
      const lettuceMat = standard({ color: 0x4caf50, roughness: 0.7 });
      const lettuce = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.008), lettuceMat);
      lettuce.position.set(-0.02, -0.06, 0.045);
      lettuce.rotation.set(-0.1, 0.1, -0.2);
      g.add(lettuce);

      g.rotation.set(-0.4, 0.5, 0.2);
      g.position.y = 0.05;

      return g;
    };

    // 7. COKE (red can + white stripe + silver rims)
    const buildCoke = () => {
      const g = new THREE.Group();

      const chromeMat = physical({
        color: 0xcccccc,
        roughness: 0.18,
        metalness: 0.9,
      });

      const canMat = physical({
        color: 0xb71c1c, // Coke red
        roughness: 0.12,
        metalness: 0.75,
        clearcoat: 0.5,
      });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.22, 24), canMat);
      body.position.y = 0.125;
      body.castShadow = true;
      g.add(body);

      // White stripe label
      const stripeMat = physical({ color: 0xffffff, roughness: 0.3 });
      const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.05, 24, 1, true), stripeMat);
      stripe.position.y = 0.125;
      g.add(stripe);

      const topRim = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.076, 0.015, 20), chromeMat);
      topRim.position.y = 0.24;
      g.add(topRim);

      const bottomRim = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.082, 0.015, 20), chromeMat);
      bottomRim.position.y = 0.01;
      g.add(bottomRim);

      return g;
    };

    // 8. FRIES (box of french fries)
    const buildFries = () => {
      const g = new THREE.Group();

      // Red Box
      const boxMat = physical({ color: 0xd32f2f, roughness: 0.2 });
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.08), boxMat);
      box.position.y = 0.08;
      box.castShadow = true;
      g.add(box);

      // French Fries
      const fryMat = standard({ color: 0xffcc00, roughness: 0.6 });
      const fryGeo = new THREE.BoxGeometry(0.015, 0.14, 0.015);
      for (let i = 0; i < 14; i++) {
        const fry = new THREE.Mesh(fryGeo, fryMat);
        const x = (Math.random() - 0.5) * 0.1;
        const z = (Math.random() - 0.5) * 0.04;
        const y = 0.12 + Math.random() * 0.04;
        fry.position.set(x, y, z);
        fry.rotation.set(
          (Math.random() - 0.5) * 0.25,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.25
        );
        fry.castShadow = true;
        g.add(fry);
      }

      return g;
    };

    // Default / fallback: ceramic coffee cup
    const buildDefault = () => {
      const g = new THREE.Group();
      const mat = physical({ color: 0xffffff, roughness: 0.12, clearcoat: 0.8 });
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.22, 24), mat);
      cup.position.y = 0.11;
      cup.castShadow = true;
      g.add(cup);
      
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 10, 20, Math.PI), mat);
      handle.position.set(0.11, 0.11, 0);
      handle.rotation.z = -Math.PI / 2;
      g.add(handle);

      const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.008, 18), standard({ color: 0x5d4037, roughness: 0.3 }));
      liquid.position.y = 0.21;
      g.add(liquid);

      return g;
    };

    // Instantiate correct model case
    switch (category) {
      case 'tea':
        root.add(buildTea()); break;
      case 'coffee':
        root.add(buildCoffee()); break;
      case 'maggi':
        root.add(buildMaggi()); break;
      case 'bread':
        root.add(buildBread()); break;
      case 'water':
        root.add(buildWaterBottle()); break;
      case 'sandwich':
        root.add(buildSandwich()); break;
      case 'coke':
        root.add(buildCoke()); break;
      case 'fries':
        root.add(buildFries()); break;
      default:
        root.add(buildDefault()); break;
    }

    // ── Animation Loop ────────────────────────────────────────────────────────
    let raf;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Spin and float
      const speed = hoverRef.current ? 0.024 : 0.008;
      root.rotation.y += speed;
      root.position.y = Math.sin(t * 1.4) * 0.04;

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize Observer ───────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      if (nw > 0 && nh > 0) {
        renderer.setSize(nw, nh);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
      }
    });
    ro.observe(mount);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
      root.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); });
        }
      });
      envTexture.dispose();
      renderer.dispose();
    };
  }, [name]);

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)',
        transform: hovered ? 'scale(1.1)' : 'scale(1)',
      }}
    />
  );
}
