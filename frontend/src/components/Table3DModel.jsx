import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Table3DModel({ category, isActive, isPaused }) {
  const mountRef = useRef(null);
  const hoverRef = useRef(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => { hoverRef.current = hovered; }, [hovered]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const W = mount.clientWidth  || 300;
    const H = mount.clientHeight || 180;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    mount.appendChild(renderer.domElement);

    // ── Scene & Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, W / H, 0.05, 100);
    camera.position.set(0, 2.0, 3.5);
    camera.lookAt(0, 0.3, 0);

    // ── Procedural HDRI Environment ───────────────────────────────────────────
    // Paint a fake sky-room cube so everything picks up reflections
    const envSize = 128;
    const faces = ['px','nx','py','ny','pz','nz'];
    const cubeData = faces.map((face) => {
      const c = document.createElement('canvas');
      c.width = c.height = envSize;
      const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, 0, envSize);
      if (face === 'py') { // ceiling – key light
        g.addColorStop(0, '#ffe8c0');
        g.addColorStop(1, '#fff5e8');
      } else if (face === 'ny') { // floor – dark
        g.addColorStop(0, '#0a1a14');
        g.addColorStop(1, '#0a1a14');
      } else { // walls – dark studio
        g.addColorStop(0, '#0d2318');
        g.addColorStop(1, '#111f17');
      }
      x.fillStyle = g;
      x.fillRect(0, 0, envSize, envSize);
      // Add a soft overhead strip on the side faces
      if (face !== 'py' && face !== 'ny') {
        x.fillStyle = 'rgba(255,230,180,0.35)';
        x.fillRect(0, 0, envSize, envSize * 0.12);
      }
      return c;
    });
    const envTexture = new THREE.CubeTexture(cubeData.map((c) => c));
    envTexture.needsUpdate = true;
    scene.environment = envTexture;
    scene.background = new THREE.Color('#0b1e15');

    // ── Lights ────────────────────────────────────────────────────────────────
    // Ambient – low, let environment do the work
    scene.add(new THREE.AmbientLight(0xfff5e8, 0.4));

    // Key – warm overhead
    const key = new THREE.SpotLight(0xfff3dc, 3.5);
    key.position.set(1.5, 5, 3);
    key.angle = 0.4;
    key.penumbra = 0.55;
    key.castShadow = true;
    key.shadow.mapSize.setScalar(1024);
    key.shadow.bias = -0.0005;
    scene.add(key);
    scene.add(key.target);

    // Fill – cool left rim
    const fill = new THREE.DirectionalLight(0xb8d9ff, 0.7);
    fill.position.set(-3, 3, 1);
    scene.add(fill);

    // Hair / rim – back right
    const rim = new THREE.DirectionalLight(0xffffff, 0.9);
    rim.position.set(2, 2, -4);
    scene.add(rim);

    // Table lamp (status glow)
    const lampColor = isActive ? 0x2ff080 : isPaused ? 0xffc040 : 0xffffff;
    const lamp = new THREE.PointLight(lampColor, isActive ? 2.8 : isPaused ? 1.8 : 0.6, 6);
    lamp.position.set(0, 2.2, 0);
    scene.add(lamp);

    // ── Root group ────────────────────────────────────────────────────────────
    const root = new THREE.Group();
    scene.add(root);

    // ────────────────────────────────────────────────────────────────────────
    //  MATERIAL HELPERS
    // ────────────────────────────────────────────────────────────────────────
    const physical = (params) => new THREE.MeshPhysicalMaterial(params);
    const standard = (params) => new THREE.MeshStandardMaterial(params);

    // Generate a felt/cloth texture with canvas
    const feltTexture = (color, size = 256) => {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const ctx = c.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, size, size);
      // Micro-fibre noise
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = Math.random() * 0.8 + 0.2;
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.repeat.set(4, 4);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      return t;
    };

    // Woodgrain texture
    const woodTexture = (base, grain, size = 256) => {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);
      // Horizontal grain lines
      for (let i = 0; i < 120; i++) {
        const y = Math.random() * size;
        const alpha = Math.random() * 0.12 + 0.02;
        const lw = Math.random() * 1.2 + 0.3;
        ctx.strokeStyle = grain;
        ctx.lineWidth = lw;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(0, y);
        let xx = 0;
        while (xx < size) {
          xx += Math.random() * 20 + 8;
          ctx.lineTo(xx, y + (Math.random() - 0.5) * 3);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };

    // ────────────────────────────────────────────────────────────────────────
    //  SHARED MATERIALS
    // ────────────────────────────────────────────────────────────────────────
    const brassMat = physical({
      color: 0xc8a24a,
      roughness: 0.08,
      metalness: 0.96,
      clearcoat: 0.4,
    });
    const chromeMat = physical({
      color: 0xd8d8d8,
      roughness: 0.04,
      metalness: 1.0,
    });

    // ────────────────────────────────────────────────────────────────────────
    //  BILLIARDS TABLE BUILDER (Pool / Snooker / Heyball)
    // ────────────────────────────────────────────────────────────────────────
    const buildBilliardsTable = (feltHex, railHex, ballSetup) => {
      const g = new THREE.Group();

      const feltMap = feltTexture(feltHex);
      const feltMat = physical({
        map: feltMap,
        color: feltHex,
        roughness: 0.92,
        metalness: 0,
        sheen: 0.4,
        sheenColor: new THREE.Color(feltHex).lerp(new THREE.Color(0xffffff), 0.4),
        sheenRoughness: 0.85,
      });

      const railWoodMap = woodTexture(railHex === '#7c491e' ? '#7c491e' : (railHex === '#3d2008' ? '#3d2008' : railHex), 'rgba(0,0,0,0.35)');
      const railMat = physical({
        map: railWoodMap,
        color: railHex,
        roughness: 0.14,
        metalness: 0.05,
        clearcoat: 0.95,
        clearcoatRoughness: 0.06,
        reflectivity: 0.85,
      });

      // ── Slate bed ──
      const slateGeo = new THREE.BoxGeometry(2.34, 0.06, 1.27);
      const slate = new THREE.Mesh(slateGeo, feltMat);
      slate.position.y = 0.52;
      slate.receiveShadow = true;
      g.add(slate);

      // ── Cushion rubber strips ──
      const cushionMat = standard({ color: feltHex, roughness: 0.9, metalness: 0 });

      const makeStrip = (w, d, px, py, pz) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.055, d), cushionMat);
        m.position.set(px, py, pz);
        m.receiveShadow = true;
        m.castShadow = true;
        g.add(m);
      };
      makeStrip(2.34, 0.055, 0, 0.555, -0.638); // back
      makeStrip(2.34, 0.055, 0, 0.555,  0.638); // front
      makeStrip(0.055, 1.27, -1.17, 0.555, 0); // left
      makeStrip(0.055, 1.27,  1.17, 0.555, 0); // right

      // ── Wooden surround / apron ──
      const apronGeo = new THREE.BoxGeometry(2.54, 0.19, 1.47);
      const apron = new THREE.Mesh(apronGeo, railMat);
      apron.position.y = 0.42;
      apron.castShadow = true;
      apron.receiveShadow = true;
      g.add(apron);

      // ── Top rail cap ──
      const capGeo = new THREE.BoxGeometry(2.54, 0.04, 1.47);
      const cap = new THREE.Mesh(capGeo, railMat);
      cap.position.y = 0.525;
      cap.castShadow = true;
      g.add(cap);

      // ── Pockets ──
      const pocketMat = new THREE.MeshBasicMaterial({ color: 0x080808 });
      const ringMat = brassMat.clone();
      const pocketPos = [
        [-1.15, -0.62], [0, -0.64], [1.15, -0.62],
        [-1.15,  0.62], [0,  0.64], [1.15,  0.62],
      ];
      pocketPos.forEach(([x, z]) => {
        const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.01, 24), pocketMat);
        hole.position.set(x, 0.524, z);
        g.add(hole);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 8, 24), ringMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(x, 0.527, z);
        g.add(ring);
      });

      // ── Legs – lathe turned ──
      const legProfile = [];
      legProfile.push(new THREE.Vector2(0, 0));
      legProfile.push(new THREE.Vector2(0.08, 0));
      legProfile.push(new THREE.Vector2(0.08, 0.025));
      legProfile.push(new THREE.Vector2(0.07, 0.045));
      legProfile.push(new THREE.Vector2(0.065, 0.095));
      legProfile.push(new THREE.Vector2(0.075, 0.14));
      // Barrel
      for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        legProfile.push(new THREE.Vector2(0.065 + Math.sin(t * Math.PI) * 0.012, 0.14 + t * 0.48));
      }
      legProfile.push(new THREE.Vector2(0.068, 0.63));
      legProfile.push(new THREE.Vector2(0.08, 0.65));
      legProfile.push(new THREE.Vector2(0.08, 0.68));
      legProfile.push(new THREE.Vector2(0, 0.68));

      const legGeo = new THREE.LatheGeometry(legProfile, 24);
      const legPositions = [[-0.9,-0.42], [0.9,-0.42], [-0.9,0.42], [0.9,0.42]];
      legPositions.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(legGeo, railMat);
        leg.position.set(lx, -0.14, lz);
        leg.castShadow = true;
        g.add(leg);
      });

      // ── Billiard Balls ──
      const makeBall = (hexColor, bx, bz) => {
        const ballGeo = new THREE.SphereGeometry(0.033, 32, 32);
        const ballMat = physical({
          color: hexColor,
          roughness: 0.02,
          metalness: 0,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          reflectivity: 0.95,
        });
        const ball = new THREE.Mesh(ballGeo, ballMat);
        ball.position.set(bx, 0.553, bz);
        ball.castShadow = true;
        g.add(ball);
      };

      if (ballSetup === 'pool') {
        const sp = 0.073; // ball diameter + tiny gap
        // Triangle rack at right
        const rx = 0.4, rz = 0;
        const h = sp * Math.sqrt(3) / 2;
        const rack = [
          [rx + 0*h, rz],
          [rx + 1*h, rz - sp/2], [rx + 1*h, rz + sp/2],
          [rx + 2*h, rz - sp], [rx + 2*h, rz], [rx + 2*h, rz + sp],
          [rx + 3*h, rz - sp*1.5], [rx + 3*h, rz - sp/2], [rx + 3*h, rz + sp/2], [rx + 3*h, rz + sp*1.5],
        ];
        const colors = [0x111111, 0xffcc00, 0x0011ee, 0xee1100, 0x8800cc, 0xff6600, 0x11aa33, 0x8b2211, 0xffcc00, 0x0011ee];
        rack.forEach(([bx, bz], i) => makeBall(colors[i % colors.length], bx, bz));
        makeBall(0xf5f5f5, -0.45, 0.02); // cue ball
      } else if (ballSetup === 'snooker') {
        const sp = 0.07;
        const h = sp * Math.sqrt(3) / 2;
        const rx = 0.38;
        for (let row = 0; row < 5; row++) {
          for (let col = 0; col <= row; col++) {
            makeBall(0xcc1122, rx + row * h, (col - row / 2) * sp);
          }
        }
        const coloredBalls = [
          [0xffde00, -0.50,  0.22], [0x11aa33, -0.50, -0.22], [0xc07030, -0.50, 0.0],
          [0x1133bb, 0.0, 0.0],     [0xff69b4, 0.24, 0.0],    [0x111111, 0.62, 0.0],
          [0xf5f5f5, -0.28, 0.0],
        ];
        coloredBalls.forEach(([col, bx, bz]) => makeBall(col, bx, bz));
      } else if (ballSetup === 'heyball') {
        const sp = 0.073;
        const h = sp * Math.sqrt(3) / 2;
        const rx = 0.38;
        const cols = [0xffdd00, 0xdd1111, 0xffdd00, 0xdd1111, 0xffdd00, 0xdd1111, 0xffdd00, 0x111111, 0xffdd00];
        [[0,0],[1,-0.5],[1,0.5],[2,-1],[2,0],[2,1],[3,-1.5],[3,-0.5],[3,0.5]].forEach(([row, col], i) => {
          makeBall(cols[i], rx + row*h, col*sp);
        });
        makeBall(0xf5f5f5, -0.45, 0);
      }


      return g;
    };

    // ────────────────────────────────────────────────────────────────────────
    //  PLAYSTATION 5 CONSOLE + DUALSENSE CONTROLLER
    // ────────────────────────────────────────────────────────────────────────
    let psCtrl = null;
    const buildPlayStation = () => {
      const ps = new THREE.Group();

      // ── Console ──
      const consoleMat = physical({ color: 0x06060c, roughness: 0.04, metalness: 0.8, clearcoat: 1.0, clearcoatRoughness: 0.04 });
      const shellMat   = physical({ color: 0xf0f0f6, roughness: 0.3,  metalness: 0.05, clearcoat: 0.2 });

      // Middle dark slab
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.12, 0.82), consoleMat);
      ps.add(slab);

      // Curved left panel
      const panelL = new THREE.Mesh(new THREE.BoxGeometry(0.022, 1.22, 0.88), shellMat);
      panelL.position.x = -0.093;
      panelL.rotation.z = -0.028;
      ps.add(panelL);

      // Curved right panel
      const panelR = panelL.clone();
      panelR.position.x = 0.093;
      panelR.rotation.z = 0.028;
      ps.add(panelR);

      // Emissive LED stripe
      const ledMat = new THREE.MeshStandardMaterial({ color: 0x0088ff, emissive: 0x0066ee, emissiveIntensity: 2.5 });
      const ledLeft = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.88, 0.83), ledMat);
      ledLeft.position.x = -0.084;
      ps.add(ledLeft);
      const ledRight = ledLeft.clone();
      ledRight.position.x = 0.084;
      ps.add(ledRight);

      // Fan vent grill lines (dark slits)
      const ventMat = new THREE.MeshBasicMaterial({ color: 0x020205 });
      for (let i = -5; i <= 5; i++) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.008, 0.6), ventMat);
        vent.position.set(0, i * 0.06, 0.4);
        ps.add(vent);
      }

      // USB & disc slot detailing
      const portMat = standard({ color: 0x333340, roughness: 0.6 });
      const discSlot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.003), portMat);
      discSlot.position.set(0, -0.45, 0.41);
      ps.add(discSlot);

      ps.position.set(0, 0.3, 0);
      ps.rotation.set(0.28, 0.45, -0.14);

      const consoleG = new THREE.Group();
      consoleG.add(ps);

      // ── DualSense Controller ──
      psCtrl = new THREE.Group();

      const csShellMat = physical({ color: 0xe8e8f0, roughness: 0.28, metalness: 0.04, clearcoat: 0.15 });
      const csDarkMat  = physical({ color: 0x141420, roughness: 0.35, metalness: 0.15 });

      // Central body
      const cbody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.26), csShellMat);
      psCtrl.add(cbody);

      // Left & right grips (cylinders rotated like handles)
      const gProfile = [];
      gProfile.push(new THREE.Vector2(0, 0));
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        gProfile.push(new THREE.Vector2(0.038 + Math.sin(t * Math.PI) * 0.008, t * 0.22));
      }
      gProfile.push(new THREE.Vector2(0, 0.22));
      const gripGeo = new THREE.LatheGeometry(gProfile, 16);

      const gripL = new THREE.Mesh(gripGeo, csShellMat);
      gripL.position.set(-0.19, -0.055, 0.06);
      gripL.rotation.set(0.35, 0, -0.45);
      psCtrl.add(gripL);

      const gripR = gripL.clone();
      gripR.position.x = 0.19;
      gripR.rotation.z = 0.45;
      psCtrl.add(gripR);

      // Dark touchpad
      const touchpad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.009, 0.1), csDarkMat);
      touchpad.position.set(0, 0.037, -0.02);
      psCtrl.add(touchpad);

      // Joysticks
      const joyMat = standard({ color: 0x111118, roughness: 0.7 });
      [[-.095, .05, .04], [.095, .05, .04]].forEach(([jx, jy, jz]) => {
        const joy = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.032, 14), joyMat);
        joy.position.set(jx, jy, jz);
        psCtrl.add(joy);
      });

      // Buttons – coloured acrylic
      const btnColors = [0xee3333, 0x2288ff, 0x55dd55, 0xeecc22];
      const angleStep = Math.PI / 2;
      btnColors.forEach((col, i) => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 10), physical({ color: col, roughness: 0.12, clearcoat: 0.8 }));
        btn.position.set(
          0.155 + Math.cos(angleStep * i) * 0.03,
          0.044,
          -0.04 + Math.sin(angleStep * i) * 0.03
        );
        psCtrl.add(btn);
      });

      psCtrl.position.set(-0.05, 0.9, 0.12);
      psCtrl.rotation.set(-0.2, -0.3, 0.1);
      consoleG.add(psCtrl);

      return consoleG;
    };

    // ────────────────────────────────────────────────────────────────────────
    //  CHESS BOARD + LATHE PIECES
    // ────────────────────────────────────────────────────────────────────────
    const buildChess = () => {
      const cg = new THREE.Group();

      // Board surface texture
      const bs = 512;
      const bc = document.createElement('canvas');
      bc.width = bc.height = bs;
      const bx = bc.getContext('2d');
      const cell = bs / 8;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          bx.fillStyle = (r + c) % 2 === 0 ? '#f0d9b5' : '#b58863';
          bx.fillRect(c * cell, r * cell, cell, cell);
        }
      }
      const boardTex = new THREE.CanvasTexture(bc);
      boardTex.colorSpace = THREE.SRGBColorSpace;

      const woodMat = physical({ color: 0x221308, roughness: 0.1, metalness: 0.02, clearcoat: 1.0, clearcoatRoughness: 0.04 });
      const surfMat = physical({ map: boardTex, roughness: 0.08, clearcoat: 1.0, clearcoatRoughness: 0.02 });

      const boardGeo = new THREE.BoxGeometry(1.82, 0.09, 1.82);
      const board = new THREE.Mesh(boardGeo, [woodMat, woodMat, surfMat, woodMat, woodMat, woodMat]);
      board.position.y = 0.25;
      board.castShadow = true;
      board.receiveShadow = true;
      cg.add(board);

      // Lathe profile for pieces
      const makePiece = (type, col, px, pz) => {
        const pts = [];
        pts.push(new THREE.Vector2(0, 0));
        pts.push(new THREE.Vector2(0.07, 0));
        pts.push(new THREE.Vector2(0.07, 0.02));
        pts.push(new THREE.Vector2(0.065, 0.03));
        pts.push(new THREE.Vector2(0.052, 0.05));
        pts.push(new THREE.Vector2(0.048, 0.085));

        if (type === 'pawn') {
          pts.push(new THREE.Vector2(0.04, 0.12));
          pts.push(new THREE.Vector2(0.036, 0.16));
          for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            pts.push(new THREE.Vector2(Math.sin(t * Math.PI) * 0.04, 0.2 + (1 - Math.cos(t * Math.PI)) * 0.04));
          }
        } else if (type === 'rook') {
          pts.push(new THREE.Vector2(0.042, 0.14));
          pts.push(new THREE.Vector2(0.046, 0.2));
          pts.push(new THREE.Vector2(0.065, 0.21));
          pts.push(new THREE.Vector2(0.065, 0.25));
          pts.push(new THREE.Vector2(0, 0.25));
        } else if (type === 'knight') {
          pts.push(new THREE.Vector2(0.042, 0.14));
          pts.push(new THREE.Vector2(0.035, 0.2));
          pts.push(new THREE.Vector2(0.05, 0.26));
          pts.push(new THREE.Vector2(0.025, 0.3));
          pts.push(new THREE.Vector2(0, 0.3));
        } else { // King
          pts.push(new THREE.Vector2(0.042, 0.14));
          pts.push(new THREE.Vector2(0.032, 0.22));
          pts.push(new THREE.Vector2(0.058, 0.25));
          pts.push(new THREE.Vector2(0.016, 0.28));
          pts.push(new THREE.Vector2(0.016, 0.31));
          pts.push(new THREE.Vector2(0.03, 0.32));
          pts.push(new THREE.Vector2(0, 0.32));
        }

        const pieceMat = physical({
          color: col,
          roughness: 0.08,
          metalness: 0.05,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
        });
        const geo = new THREE.LatheGeometry(pts, 28);
        const mesh = new THREE.Mesh(geo, pieceMat);
        mesh.position.set(px, 0.29, pz);
        mesh.castShadow = true;
        cg.add(mesh);
      };

      const W = 0xfcf9f0, B = 0x1e1612;
      const layout = [
        ['rook',   W, -0.67, -0.67], ['knight', W, -0.45, -0.67], ['rook',   W, -0.22, -0.45],
        ['pawn',   W, -0.67, -0.45], ['pawn',   W, -0.45, -0.45], ['king',   W, -0.67, -0.22],
        ['rook',   B,  0.67,  0.67], ['knight', B,  0.45,  0.67], ['rook',   B,  0.22,  0.45],
        ['pawn',   B,  0.67,  0.45], ['pawn',   B,  0.45,  0.45], ['king',   B,  0.67,  0.22],
        ['pawn',   W,  0.0, -0.22],  ['pawn',   B,  0.0,  0.22],
      ];
      layout.forEach(([type, col, px, pz]) => makePiece(type, col, px, pz));

      return cg;
    };

    // ────────────────────────────────────────────────────────────────────────
    //  CARROM BOARD + COINS
    // ────────────────────────────────────────────────────────────────────────
    const buildCarrom = () => {
      const cg = new THREE.Group();

      const s = 512;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = s;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#e8c980';
      ctx.fillRect(0, 0, s, s);
      // Wood grain
      ctx.globalAlpha = 0.18;
      for (let i = 0; i < 80; i++) {
        const y = Math.random() * s;
        ctx.strokeStyle = '#5a3000';
        ctx.lineWidth = Math.random() * 1.5 + 0.3;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y + (Math.random()-0.5)*8); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Border lines
      ctx.strokeStyle = '#2e1a08';
      ctx.lineWidth = 5;
      ctx.strokeRect(18, 18, s-36, s-36);
      ctx.lineWidth = 2;
      ctx.strokeRect(36, 36, s-72, s-72);
      // Center circles
      ctx.beginPath(); ctx.arc(s/2, s/2, 52, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(s/2, s/2, 22, 0, Math.PI*2); ctx.stroke();
      // Red queen
      ctx.fillStyle = '#c1272d';
      ctx.beginPath(); ctx.arc(s/2, s/2, 10, 0, Math.PI*2); ctx.fill();
      // Corner circles
      [[36,36],[s-36,36],[36,s-36],[s-36,s-36]].forEach(([cx,cy])=>{
        ctx.strokeStyle = '#2e1a08';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx,cy,22,0,Math.PI*2); ctx.stroke();
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.arc(cx,cy,10,0,Math.PI*2); ctx.fill();
      });

      const boardTex = new THREE.CanvasTexture(canvas);
      boardTex.colorSpace = THREE.SRGBColorSpace;

      const frameMat = physical({ color: 0x7a4018, roughness: 0.12, metalness: 0.04, clearcoat: 0.9 });
      const topMat   = physical({ map: boardTex, roughness: 0.06, clearcoat: 1.0, clearcoatRoughness: 0.02 });
      const board = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.07, 1.82), [frameMat, frameMat, topMat, frameMat, frameMat, frameMat]);
      board.position.y = 0.25;
      board.castShadow = true;
      board.receiveShadow = true;
      cg.add(board);

      // Coin profiles
      const makeCoin = (col, isStriker, cx, cz) => {
        const r = isStriker ? 0.054 : 0.038;
        const coinMat = physical({ color: col, roughness: isStriker ? 0.06 : 0.08, metalness: 0, clearcoat: 1.0, clearcoatRoughness: 0.02, reflectivity: 0.9 });
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(r, r, isStriker ? 0.022 : 0.016, 24), coinMat);
        coin.position.set(cx, 0.289, cz);
        coin.castShadow = true;
        cg.add(coin);
      };

      makeCoin(0xfafaf0, false,  0.07,  0.05);
      makeCoin(0x1a1a1a, false, -0.07, -0.05);
      makeCoin(0xfafaf0, false,  0.04, -0.09);
      makeCoin(0x1a1a1a, false, -0.04,  0.09);
      makeCoin(0xfafaf0, false,  0.0,   0.11);
      makeCoin(0x1a1a1a, false,  0.0,  -0.11);
      makeCoin(0xc1272d, false,  0.0,   0.0); // queen
      makeCoin(0xfafaf0, true,   0.42,  0.3); // striker white
      makeCoin(0x1a1a1a, true,  -0.42, -0.3); // striker black

      return cg;
    };

    // ── Build selected model ──────────────────────────────────────────────────
    switch (category) {
      case 'Snooker':
        root.add(buildBilliardsTable('#165b33', '#3d2008', 'snooker')); break;
      case 'Heyball':
        root.add(buildBilliardsTable('#0e4785', '#111120', 'heyball')); break;
      case 'PlayStation':
        root.add(buildPlayStation()); break;
      case 'Chess':
        root.add(buildChess()); break;
      case 'Carrom':
        root.add(buildCarrom()); break;
      case 'Pool':
      default:
        root.add(buildBilliardsTable('#1a5c44', '#7c491e', 'pool')); break;
    }

    // ── Animation Loop ────────────────────────────────────────────────────────
    let raf;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      const speed = hoverRef.current ? 0.028 : isActive ? 0.016 : isPaused ? 0.004 : 0.007;
      root.rotation.y += speed;
      root.position.y = Math.sin(t * 1.5) * 0.05;

      if (category === 'PlayStation' && psCtrl) {
        psCtrl.position.y = 0.9 + Math.sin(t * 2.6) * 0.08;
        psCtrl.rotation.x = -0.2 + Math.sin(t * 1.7) * 0.07;
      }

      if (isActive) lamp.intensity = 2.8 + Math.sin(t * 6) * 0.7;
      else if (isPaused) lamp.intensity = 1.8 + Math.sin(t * 2) * 0.4;

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize observer ───────────────────────────────────────────────────────
    const ro = new ResizeObserver(() => {
      if (!mount) return;
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      renderer.setSize(nw, nh);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
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
  }, [category, isActive, isPaused]);

  return (
    <div
      ref={mountRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'absolute', inset: 0, zIndex: 1,
        transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)',
        transform: hovered ? 'scale(1.08)' : 'scale(1)',
      }}
    />
  );
}
