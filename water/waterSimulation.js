import * as THREE from 'three';
import { getWaterUVFromWorld } from './waterObject.js';

export function createWaterBallController({
  renderer,
  camera,
  controls,
  water,
  ball,
  ballRadius,
  waterSim,
  waterMaterial,
  waterSize = 10
}) {
  const ballVelocity = new THREE.Vector3();
  const lastBallPosition = ball.position.clone();

  // sim states
  let draggingBall = false;
  let pointerDown = false;
  let dragDepth = ball.position.y;
  let lastPointerY = 0;

  // timing stuff for ripples
  let lastRippleTime = 0;
  let lastSurfaceSide = 0;
  let lastSurfaceContactTime = 0;

  // smoothed water height
  let smoothedWaterY = 0;

  // raycasting stuff for mouse interaction
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  // plane used to drag the ball
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragDepth);
  const dragPoint = new THREE.Vector3();

  // convert mouse from screen space to ndc
  function setPointerFromEvent(e) {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  }

  // create ripple in water sim
  function disturbUv(uv, strength = 0.015, size = 0.0018) {
    waterSim.disturbUv(uv, strength, size);
  }

  // stop ripple effect
  function clearDisturbance() {
    waterSim.clearDisturbance();
  }

  // sample water height at x,z
  function sampleWaterHeight(x, z) {
    return waterSim.sampleWaterHeight({ x, z, waterSize, waterMaterial });
  }

  // project mouse into world at a certain y depth
  function pointerWorldAtDepth(e, depthY, target) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);

    // update drag plane height
    dragPlane.set(new THREE.Vector3(0, 1, 0), -depthY);

    // intersect mouse ray with plane
    return raycaster.ray.intersectPlane(dragPlane, target);
  }

  // mouse press
  function onPointerDown(e) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);

    // check if we clicked the ball
    const ballHits = raycaster.intersectObject(ball);

    if (ballHits.length > 0) {
      draggingBall = true;
      controls.enabled = false; // disable camera controls when dragging ball

      dragDepth = ball.position.y;
      lastPointerY = e.clientY;

      // reset velocity so it doesn't snap?? not really working though...
      ballVelocity.set(0, 0, 0);

      renderer.domElement.setPointerCapture?.(e.pointerId);
      return;
    }

    // otherwise check if we clicked the water
    const waterHits = raycaster.intersectObject(water);

    if (waterHits.length > 0 && waterHits[0].uv) {
      pointerDown = true;
      controls.enabled = false; // disable camera controls when dragging water

      renderer.domElement.setPointerCapture?.(e.pointerId);
      // create ripple where clicked
      disturbUv(waterHits[0].uv, 0.045); // stronger for strong ripple point agajhfwhfegubew
    }
  }

  // mouse moves
  function onPointerMove(e) {
    if (draggingBall) {
      lastBallPosition.copy(ball.position);
      // vertical mouse movement controls depth
      const dy = e.clientY - lastPointerY;
      lastPointerY = e.clientY;
      dragDepth -= dy * 0.018;
      dragDepth = THREE.MathUtils.clamp(dragDepth, -1.45, 1.35);

      // move ball in world based on mouse -> doesn't work as well as i want
      // TODO fix movement
      if (pointerWorldAtDepth(e, dragDepth, dragPoint)) {
        ball.position.x = THREE.MathUtils.clamp(dragPoint.x, -2.0, 2.0);
        ball.position.z = THREE.MathUtils.clamp(dragPoint.z, -2.0, 2.0);
        ball.position.y = dragDepth;
      }

      // calculate velocity from movement
      ballVelocity.copy(ball.position).sub(lastBallPosition).multiplyScalar(0.35);
      ballVelocity.y = THREE.MathUtils.clamp(ballVelocity.y, -0.08, 0.08);

      // get water height at curr and prev pos
      const waterY = sampleWaterHeight(ball.position.x, ball.position.z);
      const previousWaterY = sampleWaterHeight(lastBallPosition.x, lastBallPosition.z);

      // get bottom of ball at curr and prev pos
      const ballBottom = ball.position.y - ballRadius;
      const previousBallBottom = lastBallPosition.y - ballRadius;

      // get speeds
      const speed = ball.position.distanceTo(lastBallPosition);
      const verticalSpeed = ball.position.y - lastBallPosition.y;
      const surfaceBand = ballRadius * 0.45;

      // interaction of water at top and center
      const bottomNearSurface = Math.abs(ballBottom - waterY) < surfaceBand;
      const centerNearSurface = Math.abs(ball.position.y - waterY) < ballRadius * 1.15;

      // ball rising out of water?
      const risingOutOfWater =
        previousBallBottom <= previousWaterY &&
        ballBottom >= waterY &&
        verticalSpeed > 0;

      // ball skimming surface?
      const skimmingSurface = bottomNearSurface && verticalSpeed > 0.002;

      // if interacting with surface, create ripple
      if (risingOutOfWater || skimmingSurface || centerNearSurface) {
        const uv = getWaterUVFromWorld(ball.position.x, ball.position.z, waterSize);

        const strength = THREE.MathUtils.clamp(
          0.018 + Math.max(verticalSpeed, 0) * 0.35 + speed * 0.03,
          0.014,
          0.055
        );

        disturbUv(uv, strength, risingOutOfWater ? 0.006 : 0.0035);

        lastRippleTime = performance.now();
        lastSurfaceContactTime = lastRippleTime;
      } else if (performance.now() - lastRippleTime > 80) {
        // stop ripple if inactive
        clearDisturbance();
      }

      return;
    }

    // if dragging on water
    if (pointerDown) {
      setPointerFromEvent(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(water);

      // create ripples
      if (hits.length > 0 && hits[0].uv) {
        disturbUv(hits[0].uv, 0.045);
      }
    }
  }

  // stop drag
  function stopInteraction(e) {
    if (e?.pointerId !== undefined) {
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    }

    pointerDown = false;
    draggingBall = false;
    controls.enabled = true;
    clearDisturbance();
  }

  // scroll wheel adjusts drag depth -> actually havent tested this since i dont have a mouse
  function onWheel(e) {
    if (!draggingBall) return;

    e.preventDefault();

    dragDepth += -e.deltaY * 0.0025;
    dragDepth = THREE.MathUtils.clamp(dragDepth, -2.45, 1.35);
  }

  // runs every frame
  function update() {
    const waterY = sampleWaterHeight(ball.position.x, ball.position.z);

    // smooth water height
    smoothedWaterY = THREE.MathUtils.lerp(smoothedWaterY, waterY, 0.08);
    const floatY = smoothedWaterY;

    // if not dragging, floating
    if (!draggingBall) {
      const bottomOfBall = ball.position.y - ballRadius;

      // how submerged the ball is (0 -> above water)
      const submersion = THREE.MathUtils.clamp(
        (smoothedWaterY - bottomOfBall) / (ballRadius * 2.0),
        0,
        1
      );

      // difference between curr height and target float height
      const errorToFloatHeight = floatY - ball.position.y;

      // apply buoyancy
      ballVelocity.y += errorToFloatHeight * 0.009;

      // damping based on submersion
      ballVelocity.y *= THREE.MathUtils.lerp(0.90, 0.72, submersion);

      // gravity when not submerged
      ballVelocity.y -= (1.0 - submersion) * 0.0045;

      // horizontal damping
      ballVelocity.x *= 0.92;
      ballVelocity.z *= 0.92;

      // clamp vertical speed
      ballVelocity.y = THREE.MathUtils.clamp(ballVelocity.y, -0.032, 0.032);

      // apply velocity to pos
      ball.position.add(ballVelocity);

      // keep ball within bounds
      ball.position.x = THREE.MathUtils.clamp(ball.position.x, -2.0, 2.0);
      ball.position.z = THREE.MathUtils.clamp(ball.position.z, -2.0, 2.0);
      ball.position.y = THREE.MathUtils.clamp(ball.position.y, -1.55, 2.5);

      // check surface interactions
      const ballBottom = ball.position.y - ballRadius;
      const surfaceSide = Math.sign(ballBottom - waterY);

      const bottomNearSurface = Math.abs(ballBottom - waterY) < ballRadius * 0.45;

      const risingOutOfWater =
        ballVelocity.y > 0.006 &&
        (bottomNearSurface || (lastSurfaceSide < 0 && surfaceSide >= 0));

      const skimmingSurface =
        ballVelocity.y > 0.004 &&
        Math.abs(ball.position.y - waterY) < ballRadius * 0.95;

      if (risingOutOfWater || skimmingSurface) {
        const now = performance.now();

        // limit ripple frequency
        if (now - lastSurfaceContactTime > 90) {
          const uv = getWaterUVFromWorld(ball.position.x, ball.position.z, waterSize);

          const strength = THREE.MathUtils.clamp(
            0.009 + Math.abs(ballVelocity.y) * 0.35,
            0.008,
            0.026
          );

          disturbUv(uv, strength, risingOutOfWater ? 0.005 : 0.003);

          lastRippleTime = now;
          lastSurfaceContactTime = now;
        }
      } else if (performance.now() - lastRippleTime > 120 && !pointerDown) {
        clearDisturbance();
      }

      lastSurfaceSide = surfaceSide;
    }

    // visual wobble based on velocity
    const wobbleStrength = 2.5;
    const returnSpeed = 0.12;

    const targetRotX = ballVelocity.z * wobbleStrength;
    const targetRotZ = -ballVelocity.x * wobbleStrength;

    ball.rotation.x = THREE.MathUtils.lerp(ball.rotation.x, targetRotX, returnSpeed);
    ball.rotation.z = THREE.MathUtils.lerp(ball.rotation.z, targetRotZ, returnSpeed);
  }

  function connect() {
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', stopInteraction);
    window.addEventListener('pointerleave', stopInteraction);
    window.addEventListener('blur', stopInteraction);
    window.addEventListener('wheel', onWheel, { passive: false });
  }

  function dispose() {
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', stopInteraction);
    window.removeEventListener('pointerleave', stopInteraction);
    window.removeEventListener('blur', stopInteraction);
    window.removeEventListener('wheel', onWheel);
  }

  connect();

  return {
    update,
    dispose,
    disturbUv,
    sampleWaterHeight,
    ballVelocity
  };
}