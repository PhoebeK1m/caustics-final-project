import * as THREE from 'three';
import { getWaterUvFromWorld } from './waterObject.js';

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

  let draggingBall = false;
  let pointerDown = false;
  let dragDepth = ball.position.y;
  let lastPointerY = 0;
  let lastRippleTime = 0;
  let lastSurfaceSide = 0;
  let lastSurfaceContactTime = 0;
  let smoothedWaterY = 0;

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragDepth);
  const dragPoint = new THREE.Vector3();

  function setPointerFromEvent(e) {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / innerHeight) * 2 + 1;
  }

  function disturbUv(uv, strength = 0.015, size = 0.0018) {
    waterSim.disturbUv(uv, strength, size);
  }

  function clearDisturbance() {
    waterSim.clearDisturbance();
  }

  function sampleWaterHeight(x, z) {
    return waterSim.sampleWaterHeight({
      x,
      z,
      waterSize,
      waterMaterial
    });
  }

  function pointerWorldAtDepth(e, depthY, target) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);
    dragPlane.set(new THREE.Vector3(0, 1, 0), -depthY);
    return raycaster.ray.intersectPlane(dragPlane, target);
  }

  function onPointerDown(e) {
    setPointerFromEvent(e);
    raycaster.setFromCamera(pointer, camera);

    const ballHits = raycaster.intersectObject(ball);

    if (ballHits.length > 0) {
      draggingBall = true;
      controls.enabled = false;
      dragDepth = ball.position.y;
      lastPointerY = e.clientY;
      ballVelocity.set(0, 0, 0);
      renderer.domElement.setPointerCapture?.(e.pointerId);
      return;
    }

    const waterHits = raycaster.intersectObject(water);

    if (waterHits.length > 0 && waterHits[0].uv) {
      pointerDown = true;
      controls.enabled = false;
      renderer.domElement.setPointerCapture?.(e.pointerId);
      disturbUv(waterHits[0].uv, 0.045);
    }
  }

  function onPointerMove(e) {
    if (draggingBall) {
      lastBallPosition.copy(ball.position);

      const dy = e.clientY - lastPointerY;
      lastPointerY = e.clientY;

      dragDepth -= dy * 0.018;
      dragDepth = THREE.MathUtils.clamp(dragDepth, -1.45, 1.35);

      if (pointerWorldAtDepth(e, dragDepth, dragPoint)) {
        ball.position.x = THREE.MathUtils.clamp(dragPoint.x, -2.0, 2.0);
        ball.position.z = THREE.MathUtils.clamp(dragPoint.z, -2.0, 2.0);
        ball.position.y = dragDepth;
      }

      ballVelocity.copy(ball.position).sub(lastBallPosition).multiplyScalar(0.35);
      ballVelocity.y = THREE.MathUtils.clamp(ballVelocity.y, -0.08, 0.08);

      const waterY = sampleWaterHeight(ball.position.x, ball.position.z);
      const previousWaterY = sampleWaterHeight(lastBallPosition.x, lastBallPosition.z);

      const ballBottom = ball.position.y - ballRadius;
      const previousBallBottom = lastBallPosition.y - ballRadius;

      const speed = ball.position.distanceTo(lastBallPosition);
      const verticalSpeed = ball.position.y - lastBallPosition.y;
      const surfaceBand = ballRadius * 0.45;

      const bottomNearSurface = Math.abs(ballBottom - waterY) < surfaceBand;
      const centerNearSurface = Math.abs(ball.position.y - waterY) < ballRadius * 1.15;
      const risingOutOfWater =
        previousBallBottom <= previousWaterY &&
        ballBottom >= waterY &&
        verticalSpeed > 0;

      const skimmingSurface = bottomNearSurface && verticalSpeed > 0.002;

      if (risingOutOfWater || skimmingSurface || centerNearSurface) {
        const uv = getWaterUvFromWorld(ball.position.x, ball.position.z, waterSize);
        const strength = THREE.MathUtils.clamp(
          0.018 + Math.max(verticalSpeed, 0) * 0.35 + speed * 0.03,
          0.014,
          0.055
        );

        disturbUv(uv, strength, risingOutOfWater ? 0.006 : 0.0035);
        lastRippleTime = performance.now();
        lastSurfaceContactTime = lastRippleTime;
      } else if (performance.now() - lastRippleTime > 80) {
        clearDisturbance();
      }

      return;
    }

    if (pointerDown) {
      setPointerFromEvent(e);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(water);

      if (hits.length > 0 && hits[0].uv) {
        disturbUv(hits[0].uv, 0.045);
      }
    }
  }

  function stopInteraction(e) {
    if (e?.pointerId !== undefined) {
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    }

    pointerDown = false;
    draggingBall = false;
    controls.enabled = true;
    clearDisturbance();
  }

  function onWheel(e) {
    if (!draggingBall) return;

    e.preventDefault();
    dragDepth += -e.deltaY * 0.0025;
    dragDepth = THREE.MathUtils.clamp(dragDepth, -1.45, 1.35);
  }

  function update() {
    const waterY = sampleWaterHeight(ball.position.x, ball.position.z);

    smoothedWaterY = THREE.MathUtils.lerp(smoothedWaterY, waterY, 0.08);
    const floatY = smoothedWaterY;

    if (!draggingBall) {
      const bottomOfBall = ball.position.y - ballRadius;
      const submersion = THREE.MathUtils.clamp(
        (smoothedWaterY - bottomOfBall) / (ballRadius * 2.0),
        0,
        1
      );

      const errorToFloatHeight = floatY - ball.position.y;

      ballVelocity.y += errorToFloatHeight * 0.009;
      ballVelocity.y *= THREE.MathUtils.lerp(0.90, 0.72, submersion);
      ballVelocity.y -= (1.0 - submersion) * 0.0045;

      ballVelocity.x *= 0.92;
      ballVelocity.z *= 0.92;
      ballVelocity.y = THREE.MathUtils.clamp(ballVelocity.y, -0.032, 0.032);

      ball.position.add(ballVelocity);

      ball.position.x = THREE.MathUtils.clamp(ball.position.x, -2.0, 2.0);
      ball.position.z = THREE.MathUtils.clamp(ball.position.z, -2.0, 2.0);
      ball.position.y = THREE.MathUtils.clamp(ball.position.y, -1.55, 2.5);

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

        if (now - lastSurfaceContactTime > 90) {
          const uv = getWaterUvFromWorld(ball.position.x, ball.position.z, waterSize);
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