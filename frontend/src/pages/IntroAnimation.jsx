import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import Logo from '../components/Logo';

export default function IntroAnimation() {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { admin, loading } = useAuth();
  const { club_name } = useBranding();
  const [fadingOut, setFadingOut] = useState(false);

  // Authenticated or unauthenticated users bypass the intro animation if they already watched it in this session
  useEffect(() => {
    if (!loading) {
      const introDone = sessionStorage.getItem('intro_done');
      if (introDone) {
        if (admin) {
          navigate('/dashboard', { replace: true });
        } else {
          navigate('/login', { replace: true, state: { skipIntro: true } });
        }
      }
    }
  }, [admin, loading, navigate]);

  const handleTransition = () => {
    setFadingOut(true);
    sessionStorage.setItem('intro_done', 'true');
    setTimeout(() => {
      if (admin) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', { replace: true, state: { skipIntro: true } });
      }
    }, 600);
  };

  const handleSkip = () => {
    handleTransition();
  };

  useEffect(() => {
    if (loading) return;
    const introDone = sessionStorage.getItem('intro_done');
    if (introDone) return;
    
    if (!containerRef.current) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create scene, camera, renderer
    const scene = new THREE.Scene();
    // Background matches deep felt green --felt-900
    scene.background = new THREE.Color('#0b2b22');

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    // Camera starting position: cinematic high angle
    camera.position.set(-12, 14, 12);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // Dynamic hanging lights over the table for real-world feel
    const tableLight1 = new THREE.SpotLight(0xffffff, 150);
    tableLight1.position.set(-5, 8, 0);
    tableLight1.angle = Math.PI / 3;
    tableLight1.penumbra = 0.8;
    tableLight1.castShadow = true;
    tableLight1.shadow.mapSize.width = 1024;
    tableLight1.shadow.mapSize.height = 1024;
    tableLight1.shadow.bias = -0.001;
    scene.add(tableLight1);

    const tableLight2 = new THREE.SpotLight(0xffffff, 150);
    tableLight2.position.set(5, 8, 0);
    tableLight2.angle = Math.PI / 3;
    tableLight2.penumbra = 0.8;
    tableLight2.castShadow = true;
    tableLight2.shadow.mapSize.width = 1024;
    tableLight2.shadow.mapSize.height = 1024;
    tableLight2.shadow.bias = -0.001;
    scene.add(tableLight2);

    // Table dimensions
    const tableWidth = 20;
    const tableDepth = 10.5;
    const ballRadius = 0.22;

    // Table Felt (green cloth surface)
    const feltGeo = new THREE.BoxGeometry(tableWidth, 0.4, tableDepth);
    const feltMat = new THREE.MeshStandardMaterial({
      color: 0x14463a, // felt green
      roughness: 0.75,
      metalness: 0.05,
    });
    const feltMesh = new THREE.Mesh(feltGeo, feltMat);
    feltMesh.position.y = -0.2;
    feltMesh.receiveShadow = true;
    scene.add(feltMesh);

    // Cushion rails (wood outer border)
    const railHeight = 0.6;
    const railThickness = 0.6;
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x5c261e, // mahogany wood
      roughness: 0.35,
      metalness: 0.1,
    });

    // Top & Bottom rails
    const railTBGeo = new THREE.BoxGeometry(tableWidth + railThickness * 2, railHeight, railThickness);
    const railTop = new THREE.Mesh(railTBGeo, railMat);
    railTop.position.set(0, railHeight / 2 - 0.2, -tableDepth / 2 - railThickness / 2);
    railTop.castShadow = true;
    railTop.receiveShadow = true;
    scene.add(railTop);

    const railBottom = new THREE.Mesh(railTBGeo, railMat);
    railBottom.position.set(0, railHeight / 2 - 0.2, tableDepth / 2 + railThickness / 2);
    railBottom.castShadow = true;
    railBottom.receiveShadow = true;
    scene.add(railBottom);

    // Left & Right rails
    const railLRGeo = new THREE.BoxGeometry(railThickness, railHeight, tableDepth);
    const railLeft = new THREE.Mesh(railLRGeo, railMat);
    railLeft.position.set(-tableWidth / 2 - railThickness / 2, railHeight / 2 - 0.2, 0);
    railLeft.castShadow = true;
    railLeft.receiveShadow = true;
    scene.add(railLeft);

    const railRight = new THREE.Mesh(railLRGeo, railMat);
    railRight.position.set(tableWidth / 2 + railThickness / 2, railHeight / 2 - 0.2, 0);
    railRight.castShadow = true;
    railRight.receiveShadow = true;
    scene.add(railRight);

    // Pockets (6 black cylinders slightly recessed in the rails)
    const pockets = [
      { x: -tableWidth / 2 + 0.1, z: -tableDepth / 2 + 0.1 }, // Top Left
      { x: 0, z: -tableDepth / 2 - 0.05 },                   // Top Middle
      { x: tableWidth / 2 - 0.1, z: -tableDepth / 2 + 0.1 },  // Top Right
      { x: -tableWidth / 2 + 0.1, z: tableDepth / 2 - 0.1 },  // Bottom Left
      { x: 0, z: tableDepth / 2 + 0.05 },                    // Bottom Middle
      { x: tableWidth / 2 - 0.1, z: tableDepth / 2 - 0.1 },   // Bottom Right
    ];

    const pocketGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.1, 32);
    const pocketMat = new THREE.MeshBasicMaterial({ color: 0x070b09 }); // dark near black

    const pocketRingGeo = new THREE.TorusGeometry(0.48, 0.06, 8, 32);
    const pocketRingMat = new THREE.MeshStandardMaterial({
      color: 0xc9a24b, // brass
      metalness: 0.9,
      roughness: 0.18,
    });

    pockets.forEach((p) => {
      const pocketMesh = new THREE.Mesh(pocketGeo, pocketMat);
      pocketMesh.position.set(p.x, 0.01, p.z);
      scene.add(pocketMesh);

      const ringMesh = new THREE.Mesh(pocketRingGeo, pocketRingMat);
      ringMesh.rotation.x = Math.PI / 2;
      ringMesh.position.set(p.x, 0.06, p.z);
      scene.add(ringMesh);
    });

    // Table legs
    const legGeo = new THREE.CylinderGeometry(0.5, 0.35, 5, 16);
    const legPositions = [
      [-tableWidth / 2 + 1, -2.7, -tableDepth / 2 + 1],
      [tableWidth / 2 - 1, -2.7, -tableDepth / 2 + 1],
      [-tableWidth / 2 + 1, -2.7, tableDepth / 2 - 1],
      [tableWidth / 2 - 1, -2.7, tableDepth / 2 - 1],
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, railMat);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      scene.add(leg);
    });

    // Cue stick
    const cueStickGeo = new THREE.CylinderGeometry(0.04, 0.08, 7.5, 16);
    const cueStickWoodMat = new THREE.MeshStandardMaterial({
      color: 0xebd5a3, // light wood
      roughness: 0.5,
      metalness: 0.05,
    });
    const cueStickHandleMat = new THREE.MeshStandardMaterial({
      color: 0x16201c, // dark grip wrap
      roughness: 0.8,
    });
    const cueStick = new THREE.Group();
    
    // Assemble cue stick parts
    const shaft = new THREE.Mesh(cueStickGeo, cueStickWoodMat);
    shaft.position.y = 3.75;
    shaft.castShadow = true;
    cueStick.add(shaft);
    
    const handleGeo = new THREE.CylinderGeometry(0.082, 0.082, 2, 16);
    const handle = new THREE.Mesh(handleGeo, cueStickHandleMat);
    handle.position.y = 1;
    handle.castShadow = true;
    cueStick.add(handle);

    // Rotate cue stick so it points horizontally along the X-axis
    cueStick.rotation.z = Math.PI / 2;
    cueStick.position.set(-9, ballRadius, 0); // start position behind cue ball
    scene.add(cueStick);

    // Cue stick visibility
    cueStick.visible = false;

    // Set up balls
    const balls = [];
    const ballGeometry = new THREE.SphereGeometry(ballRadius, 32, 32);

    const cueBallMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.06,
      metalness: 0.1,
    });

    // Cue ball object
    const cueBall = {
      x: -5,
      z: 0,
      y: ballRadius,
      vx: 0,
      vz: 0,
      vy: 0,
      isCue: true,
      mesh: new THREE.Mesh(ballGeometry, cueBallMat),
      sunk: false,
    };
    cueBall.mesh.position.set(cueBall.x, cueBall.y, cueBall.z);
    cueBall.mesh.castShadow = true;
    cueBall.mesh.receiveShadow = true;
    scene.add(cueBall.mesh);
    balls.push(cueBall);

    // Crimson red balls arranged in a triangle
    const redBallMat = new THREE.MeshStandardMaterial({
      color: 0xc1272d, // billiard red
      roughness: 0.06,
      metalness: 0.1,
    });

    const spacing = ballRadius * 2 + 0.005;
    const rowSpacing = spacing * Math.sqrt(3) / 2;
    const rackStartX = 3.5;

    let ballId = 0;
    for (let row = 0; row < 5; row++) {
      const x = rackStartX + row * rowSpacing;
      const count = row + 1;
      const zStart = -((count - 1) * spacing) / 2;
      for (let col = 0; col < count; col++) {
        const z = zStart + col * spacing;
        const redBallMesh = new THREE.Mesh(ballGeometry, redBallMat);
        redBallMesh.position.set(x, ballRadius, z);
        redBallMesh.castShadow = true;
        redBallMesh.receiveShadow = true;
        scene.add(redBallMesh);

        balls.push({
          id: ballId++,
          x: x,
          z: z,
          y: ballRadius,
          vx: 0,
          vz: 0,
          vy: 0,
          isCue: false,
          mesh: redBallMesh,
          sunk: false,
        });
      }
    }

    // Animation timeline parameters
    let state = 'init'; // 'init' -> 'camera_pan' -> 'cue_aim' -> 'cue_strike' -> 'simulation' -> 'complete'
    let timer = 0;
    let transitionTriggered = false;
    let collisionOccurred = false;
    let shakeTimer = 0;
    let timeScale = 1.0;

    // Boundaries of the table rails (taking into account ball radius)
    const minX = -tableWidth / 2 + ballRadius;
    const maxX = tableWidth / 2 - ballRadius;
    const minZ = -tableDepth / 2 + ballRadius;
    const maxZ = tableDepth / 2 - ballRadius;

    // Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      
      const dt = Math.min(clock.getDelta(), 0.03); // Cap dt to avoid large steps
      timer += dt;

      // 1. STATE MACHINE
      if (state === 'init') {
        state = 'camera_pan';
      }

      if (state === 'camera_pan') {
        // Smoothly interpolate camera from high angle to behind the cue ball
        const progress = Math.min(timer / 1.6, 1);
        
        // Circular path camera rotation
        const angle = Math.PI * 0.75 - progress * Math.PI * 0.75; // Rotate 135 degrees to 0 degrees
        const radius = 17 - progress * 4;
        camera.position.x = cueBall.x - radius * Math.cos(angle);
        camera.position.z = radius * Math.sin(angle);
        camera.position.y = 14 - progress * 10;
        
        // Target looks slightly ahead of cue ball towards red rack
        camera.lookAt(new THREE.Vector3(1, 0.2, 0));

        if (progress >= 1) {
          state = 'cue_aim';
          timer = 0;
        }
      }

      if (state === 'cue_aim') {
        cueStick.visible = true;
        // Aiming: Line up stick behind cue ball, pull back
        const progress = Math.min(timer / 1.0, 1);
        
        // Pull back stick
        const pullBackDist = progress * 1.5;
        cueStick.position.set(cueBall.x - 4.25 - pullBackDist, ballRadius, 0);

        if (progress >= 1) {
          state = 'cue_strike';
          timer = 0;
        }
      }

      if (state === 'cue_strike') {
        // Strike forward rapidly!
        const strikeTime = 0.12;
        const progress = Math.min(timer / strikeTime, 1);
        
        const startX = cueBall.x - 5.75;
        const strikeDist = progress * 2.0;
        cueStick.position.set(startX + strikeDist, ballRadius, 0);

        if (progress >= 1) {
          // HIT! Strike the cue ball
          cueBall.vx = 22.0; // High speed hit in positive x direction
          cueBall.vz = (Math.random() - 0.5) * 0.4; // slight off-center angle for dispersion
          
          cueStick.visible = false;
          state = 'simulation';
          timer = 0;
        }
      }

      if (state === 'simulation') {
        // Slow pan follow: camera glides slowly to follow cue ball/action
        const targetCamPos = new THREE.Vector3(2, 6, 9);
        camera.position.lerp(targetCamPos, 0.015);
        camera.lookAt(new THREE.Vector3(2, 0, 0));

        // Time dilation (bullet time) as cue ball approaches the rack
        const distToRack = 3.5 - cueBall.x;
        if (distToRack > 0 && distToRack < 1.3 && !collisionOccurred) {
          timeScale = 0.15; // slow motion
        } else if (collisionOccurred && timeScale < 1.0) {
          timeScale = Math.min(timeScale + dt * 0.85, 1.0); // smooth return to normal
        }

        const effectiveDt = dt * timeScale;

        // Physics Engine updates
        let ballsMoving = false;

        // Friction and position update
        balls.forEach((ball) => {
          if (ball.sunk) return;

          // Apply velocity
          ball.x += ball.vx * effectiveDt;
          ball.z += ball.vz * effectiveDt;
          ball.y += ball.vy * effectiveDt;

          // Apply friction (deceleration)
          ball.vx *= Math.pow(0.978, effectiveDt * 60);
          ball.vz *= Math.pow(0.978, effectiveDt * 60);

          // Stop ball if moving extremely slowly
          if (Math.hypot(ball.vx, ball.vz) < 0.1) {
            ball.vx = 0;
            ball.vz = 0;
          } else {
            ballsMoving = true;
          }

          // Cushion collision (bounce)
          const elasticity = 0.82;
          if (ball.x < minX) {
            ball.x = minX;
            ball.vx = -ball.vx * elasticity;
          } else if (ball.x > maxX) {
            ball.x = maxX;
            ball.vx = -ball.vx * elasticity;
          }

          if (ball.z < minZ) {
            ball.z = minZ;
            ball.vz = -ball.vz * elasticity;
          } else if (ball.z > maxZ) {
            ball.z = maxZ;
            ball.vz = -ball.vz * elasticity;
          }

          // Update 3D mesh position
          ball.mesh.position.set(ball.x, ball.y, ball.z);
        });

        // Ball-to-ball collisions (Elastic 2D collisions in horizontal plane)
        for (let i = 0; i < balls.length; i++) {
          const b1 = balls[i];
          if (b1.sunk) continue;

          for (let j = i + 1; j < balls.length; j++) {
            const b2 = balls[j];
            if (b2.sunk) continue;

            const dx = b2.x - b1.x;
            const dz = b2.z - b1.z;
            const dist = Math.hypot(dx, dz);
            const minDist = ballRadius * 2;

            if (dist < minDist) {
              // Overlap resolution (push apart slightly to prevent clipping)
              const overlap = minDist - dist;
              const nx = dx / dist;
              const nz = dz / dist;

              b1.x -= nx * overlap * 0.5;
              b1.z -= nz * overlap * 0.5;
              b2.x += nx * overlap * 0.5;
              b2.z += nz * overlap * 0.5;

              b1.mesh.position.set(b1.x, b1.y, b1.z);
              b2.mesh.position.set(b2.x, b2.y, b2.z);

              // Trigger collision impact flags
              if ((b1.isCue || b2.isCue) && !collisionOccurred) {
                collisionOccurred = true;
                shakeTimer = 0.45;
              }

              // Elastic collision calculation
              const rvx = b1.vx - b2.vx;
              const rvz = b1.vz - b2.vz;
              const relVelNormal = rvx * nx + rvz * nz;

              if (relVelNormal > 0) {
                // Moving towards each other
                const impulse = relVelNormal; // equal masses, coefficient of restitution = 1 for elastic
                b1.vx -= impulse * nx;
                b1.vz -= impulse * nz;
                b2.vx += impulse * nx;
                b2.vz += impulse * nz;
              }
            }
          }
        }

        // Pocket check (detect balls falling in)
        balls.forEach((ball) => {
          if (ball.sunk) return;

          pockets.forEach((p) => {
            const distToPocket = Math.hypot(ball.x - p.x, ball.z - p.z);
            // Pocket radius is roughly 0.48
            if (distToPocket < 0.42) {
              // Trigger sink sequence
              ball.sunk = true;
              ball.vx = 0;
              ball.vz = 0;
              
              // Animate drop down and shrink
              const animateSink = () => {
                ball.y -= 0.15;
                const scale = Math.max(ball.mesh.scale.x - 0.12, 0);
                ball.mesh.scale.set(scale, scale, scale);
                ball.mesh.position.set(ball.x, ball.y, ball.z);
                
                if (scale > 0) {
                  requestAnimationFrame(animateSink);
                } else {
                  scene.remove(ball.mesh);
                }
              };
              animateSink();
            }
          });
        });

        // Safety timeout (max 4.2s of simulation) or all balls stopped
        if (!ballsMoving || timer > 4.2) {
          state = 'complete';
          timer = 0;
        }
      }

      if (state === 'complete') {
        if (!transitionTriggered) {
          transitionTriggered = true;
          handleTransition();
        }
      }

      // Apply camera shake if active
      if (shakeTimer > 0) {
        shakeTimer -= dt;
        const currentShake = 0.09 * (shakeTimer / 0.45);
        camera.position.x += (Math.random() - 0.5) * currentShake;
        camera.position.y += (Math.random() - 0.5) * currentShake;
        camera.position.z += (Math.random() - 0.5) * currentShake;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Responsive window resizing
    const handleResize = () => {
      if (!camera || !renderer) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Clean up on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      
      if (renderer && renderer.domElement && containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      // Dispose resources
      feltGeo.dispose();
      feltMat.dispose();
      railTBGeo.dispose();
      railLRGeo.dispose();
      railMat.dispose();
      pocketGeo.dispose();
      pocketMat.dispose();
      pocketRingGeo.dispose();
      pocketRingMat.dispose();
      legGeo.dispose();
      cueStickGeo.dispose();
      cueStickWoodMat.dispose();
      cueStickHandleMat.dispose();
      ballGeometry.dispose();
      cueBallMat.dispose();
      redBallMat.dispose();
      renderer.dispose();
    };
  }, [admin, loading, navigate]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.wrapper,
        opacity: fadingOut ? 0 : 1,
        transition: 'opacity 0.6s ease-in-out',
      }}
    >
      {/* 3D Canvas container */}
      <div ref={containerRef} style={styles.canvasContainer} />

      {/* Floating UI overlay */}
      <div style={styles.overlay}>
        <div style={styles.header}>
          <Logo size={40} />
          <h1 style={styles.title}>{club_name}</h1>
        </div>
        <button style={styles.skipBtn} onClick={handleSkip}>
          Skip Intro
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ marginLeft: 6 }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#0b2b22',
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 1,
  },
  loadingContainer: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0b2b22',
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '3px solid rgba(201, 162, 75, 0.2)',
    borderTopColor: '#c9a24b',
    animation: 'spin 1s linear infinite',
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    zIndex: 10,
    pointerEvents: 'none',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '32px 40px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    opacity: 0.9,
    animation: 'fadeInDown 1s ease',
  },
  logoCrest: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: '1.5px solid #c9a24b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: 20,
    color: '#e3c878',
    fontWeight: 600,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.6rem',
    fontWeight: 600,
    color: '#f4f1e8',
    margin: 0,
    letterSpacing: '0.01em',
  },
  skipBtn: {
    position: 'absolute',
    top: 32,
    right: 40,
    pointerEvents: 'auto',
    background: 'rgba(11, 43, 34, 0.65)',
    backdropFilter: 'blur(8px)',
    border: '1.5px solid rgba(201, 162, 75, 0.4)',
    borderRadius: '24px',
    color: '#e3c878',
    padding: '10px 20px',
    fontSize: '0.85rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 12px rgba(11, 43, 34, 0.25)',
    outline: 'none',
    animation: 'fadeIn 1.2s ease',
    '&:hover': {
      borderColor: '#e3c878',
      color: '#f4f1e8',
      background: 'rgba(201, 162, 75, 0.15)',
    },
  },
};
