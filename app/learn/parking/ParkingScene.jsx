"use client";
import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Billboard, Environment, RoundedBox, Sky, Stats, Text, useCursor, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { fetchLatestLicenseObjectPath, resolveLicenseImageUrl } from '@/actions/license/license';
import { useMarkerController } from '@/hooks/useMarkerController';
import { playSfx } from '@/lib/audio/sfx';

// Simple key input
const pressed = new Set();
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e) => { pressed.add(e.key.toLowerCase()); });
  window.addEventListener('keyup', (e) => { pressed.delete(e.key.toLowerCase()); });
}
const key = (k) => pressed.has(k.toLowerCase());
const joystickVector = { x: 0, y: 0 };
const setJoystickVector = (x, y) => {
  joystickVector.x = THREE.MathUtils.clamp(Number.isFinite(x) ? x : 0, -1, 1);
  joystickVector.y = THREE.MathUtils.clamp(Number.isFinite(y) ? y : 0, -1, 1);
};
const getJoystickVector = () => joystickVector;
const easeOutCubic = (t) => {
  const clamped = THREE.MathUtils.clamp(t, 0, 1);
  return 1 - ((1 - clamped) ** 3);
};
const normalizeAngle = (angle) => {
  if (!Number.isFinite(angle)) {
    return 0;
  }
  const twoPi = Math.PI * 2;
  let wrapped = angle % twoPi;
  if (wrapped > Math.PI) {
    wrapped -= twoPi;
  } else if (wrapped < -Math.PI) {
    wrapped += twoPi;
  }
  return wrapped;
};
const JOYSTICK_DEADZONE = 0.22;
const STACK_CAMERA_CONFIG = {
  position: new THREE.Vector3(-40, 74, -58),
  lookAt: new THREE.Vector3(-40, 0, -10),
};
// Adjust this vector pair to change the cinematic view used during the queue minigame.
const QUEUE_CAMERA_CONFIG = {
  position: new THREE.Vector3(38, 72, 84),
  lookAt: new THREE.Vector3(40, -6, -8),
};
const QUEUE_SLOT_HEIGHT = 0.2;
const STACK_SLOT_POSITIONS = Object.freeze([
  { id: 1, position: [-68.5, QUEUE_SLOT_HEIGHT, -37] },
  { id: 2, position: [-61, QUEUE_SLOT_HEIGHT, -37] },
  { id: 3, position: [-53, QUEUE_SLOT_HEIGHT, -37] },
  { id: 4, position: [-45, QUEUE_SLOT_HEIGHT, -37] },
  { id: 5, position: [-37, QUEUE_SLOT_HEIGHT, -37] },
  { id: 6, position: [-29.4, QUEUE_SLOT_HEIGHT, -37] },
  { id: 7, position: [-21.5, QUEUE_SLOT_HEIGHT, -37] },
  { id: 8, position: [-14, QUEUE_SLOT_HEIGHT, -37] },
  { id: 9, position: [-6, QUEUE_SLOT_HEIGHT, -37] },
  { id: 10, position: [-68.5, QUEUE_SLOT_HEIGHT, 7] },
  { id: 11, position: [-61, QUEUE_SLOT_HEIGHT, 7] },
  { id: 12, position: [-53, QUEUE_SLOT_HEIGHT, 7] },
  { id: 13, position: [-45, QUEUE_SLOT_HEIGHT, 7] },
  { id: 14, position: [-37, QUEUE_SLOT_HEIGHT, 7] },
  { id: 15, position: [-29.4, QUEUE_SLOT_HEIGHT, 7] },
  { id: 16, position: [-21.5, QUEUE_SLOT_HEIGHT, 7] },
  { id: 17, position: [-14, QUEUE_SLOT_HEIGHT, 7] },
  { id: 18, position: [-6, QUEUE_SLOT_HEIGHT, 7] },
]);
const STACK_SLOT_LOOKUP = Object.freeze(
  STACK_SLOT_POSITIONS.reduce((acc, slot) => {
    acc[slot.id] = slot.position;
    return acc;
  }, {}),
);
const STACK_SLOT_ID_TO_INDEX = new Map();
STACK_SLOT_POSITIONS.forEach((slot, idx) => {
  STACK_SLOT_ID_TO_INDEX.set(slot.id, idx);
});
const QUEUE_SLOT_POSITIONS = Object.freeze([
  { id: 1, position: [68.5, QUEUE_SLOT_HEIGHT, 37] },
  { id: 2, position: [61, QUEUE_SLOT_HEIGHT, 37] },
  { id: 3, position: [53, QUEUE_SLOT_HEIGHT, 37] },
  { id: 4, position: [45, QUEUE_SLOT_HEIGHT, 37] },
  { id: 5, position: [37, QUEUE_SLOT_HEIGHT, 37] },
  { id: 6, position: [29.4, QUEUE_SLOT_HEIGHT, 37] },
  { id: 7, position: [21.5, QUEUE_SLOT_HEIGHT, 37] },
  { id: 8, position: [14, QUEUE_SLOT_HEIGHT, 37] },
  { id: 9, position: [6, QUEUE_SLOT_HEIGHT, 37] },
  { id: 10, position: [68.5, QUEUE_SLOT_HEIGHT, -7] },
  { id: 11, position: [61, QUEUE_SLOT_HEIGHT, -7] },
  { id: 12, position: [53, QUEUE_SLOT_HEIGHT, -7] },
  { id: 13, position: [45, QUEUE_SLOT_HEIGHT, -7] },
  { id: 14, position: [37, QUEUE_SLOT_HEIGHT, -7] },
  { id: 15, position: [29.4, QUEUE_SLOT_HEIGHT, -7] },
  { id: 16, position: [21.5, QUEUE_SLOT_HEIGHT, -7] },
  { id: 17, position: [14, QUEUE_SLOT_HEIGHT, -7] },
  { id: 18, position: [6, QUEUE_SLOT_HEIGHT, -7] },
]);
const QUEUE_SLOT_ID_TO_INDEX = new Map();
QUEUE_SLOT_POSITIONS.forEach((slot, idx) => {
  QUEUE_SLOT_ID_TO_INDEX.set(slot.id, idx);
});
// Update these coordinates to move the numbered markers rendered during the stack minigame.
const STACK_NUMBER_MARKER_POSITIONS = Object.freeze(STACK_SLOT_POSITIONS.map((slot) => ({
  id: slot.id,
  position: [...slot.position],
})));
const QUEUE_SLOT_LOOKUP = Object.freeze(
  QUEUE_SLOT_POSITIONS.reduce((acc, slot) => {
    acc[slot.id] = slot.position;
    return acc;
  }, {}),
);
const QUEUE_CAR_PHASE_SLOT = 'slot';
const QUEUE_CAR_PHASE_HOLD = 'hold';
const QUEUE_CAR_PHASE_EXIT = 'exit';
const SLOT_DATASETS = Object.freeze({
  stack: Object.freeze({
    positions: STACK_SLOT_POSITIONS,
    lookup: STACK_SLOT_LOOKUP,
    idToIndex: STACK_SLOT_ID_TO_INDEX,
  }),
  queue: Object.freeze({
    positions: QUEUE_SLOT_POSITIONS,
    lookup: QUEUE_SLOT_LOOKUP,
    idToIndex: QUEUE_SLOT_ID_TO_INDEX,
  }),
});
const getSlotDataset = (mode) => SLOT_DATASETS[mode] || SLOT_DATASETS.queue;
const FREE_MARKER_POSITIONS = Object.freeze([
  { id: 1, position: [-64, QUEUE_SLOT_HEIGHT, -18] },
  { id: 2, position: [-64, QUEUE_SLOT_HEIGHT, -11.5] },
  { id: 3, position: [-64, QUEUE_SLOT_HEIGHT, -4.5] },
  { id: 4, position: [-10, QUEUE_SLOT_HEIGHT, -18] },
  { id: 5, position: [-10, QUEUE_SLOT_HEIGHT, -11.5] },
  { id: 6, position: [-10, QUEUE_SLOT_HEIGHT, -4.5] },
  { id: 7, position: [-64, QUEUE_SLOT_HEIGHT, 40] },
  { id: 8, position: [-64, QUEUE_SLOT_HEIGHT, 33] },
  { id: 9, position: [-64, QUEUE_SLOT_HEIGHT, 26.5] },
  { id: 10, position: [-10, QUEUE_SLOT_HEIGHT, 40] },
  { id: 11, position: [-10, QUEUE_SLOT_HEIGHT, 33] },
  { id: 12, position: [-10, QUEUE_SLOT_HEIGHT, 26] },
  { id: 13, position: [11, QUEUE_SLOT_HEIGHT, -40] },
  { id: 14, position: [11, QUEUE_SLOT_HEIGHT, -33.5] },
  { id: 15, position: [11, QUEUE_SLOT_HEIGHT, -26.5] },
  { id: 16, position: [11, QUEUE_SLOT_HEIGHT, 4] },
  { id: 17, position: [11, QUEUE_SLOT_HEIGHT, 11] },
  { id: 18, position: [11, QUEUE_SLOT_HEIGHT, 18] },
]);
const FREE_MARKER_LOOKUP = Object.freeze(
  FREE_MARKER_POSITIONS.reduce((acc, marker) => {
    acc[marker.id] = marker.position;
    return acc;
  }, {}),
);
const QUEUE_CAR_SPAWN_POSITION = Object.freeze([40, 0.3, -100]);
const QUEUE_CAR_ANIMATION_DURATION = 4500;
const QUEUE_FAST_FORWARD_MULTIPLIER = 6;
const QUEUE_EXIT_POSITION = Object.freeze([40, 0.3, -140]);
const SLOT_PARKING_QUATERNION = new THREE.Quaternion();
const SLOT_PARKING_HEADING = Object.freeze([
  SLOT_PARKING_QUATERNION.x,
  SLOT_PARKING_QUATERNION.y,
  SLOT_PARKING_QUATERNION.z,
  SLOT_PARKING_QUATERNION.w,
]);
const SELECTED_QUEUE_CAR_HIGHLIGHT = '#43ff9a';
const QUEUE_LOADING_DELAY_MS = 1500;
const QUEUE_LOADING_MESSAGES = Object.freeze([
  'Calibrating parking sensors',
  'Synchronizing traffic lights',
  'Charging EV batteries',
  'Plotting the perfect parking path',
]);
const DEFAULT_QUEUE_CAR_MODEL = '/car-show/models/car/scene.gltf';
const QUEUE_CAR_MODEL_PATHS = Object.freeze([
  '/car-models/red_car.glb',
  '/car-models/white_car.glb',
]);
const DEFAULT_QUEUE_CAR_MODEL_SETTINGS = Object.freeze({
  scale: 0.01,
  rotation: Object.freeze([0, 0, 0]),
});
const QUEUE_CAR_MODEL_SETTINGS = Object.freeze({
  '/car-models/red_car.glb': Object.freeze({
    scale: 0.018,
    rotation: Object.freeze([0, 1.56, 0]),
  }),
  '/car-models/white_car.glb': Object.freeze({
    scale: 0.05,
    rotation: Object.freeze([0, 0, 0]),
  }),
});
const QUEUE_CAR_MODEL_COLOR_OPTIONS = Object.freeze({
  '/car-models/red_car.glb': Object.freeze([
    '#ff5252',
    '#ff7043',
    '#ff8a65',
    '#ffb74d',
  ]),
  '/car-models/white_car.glb': Object.freeze([
    '#f5f5f5',
    '#b3e5fc',
    '#c5e1a5',
    '#d1c4e9',
  ]),
});

const LICENSE_PLATE_MAX_LENGTH = 10;

const sanitizeLicensePlateValue = (value) => {
  if (typeof value !== 'string') {
    return '';
  }
  return value
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9-]/g, '')
    .toUpperCase()
    .slice(0, LICENSE_PLATE_MAX_LENGTH);
};

const toPositionArray = (value) => {
  if (Array.isArray(value) && value.length >= 3) {
    return [Number(value[0] ?? 0), Number(value[1] ?? 0), Number(value[2] ?? 0)];
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value.position) && value.position.length >= 3) {
      return [Number(value.position[0] ?? 0), Number(value.position[1] ?? 0), Number(value.position[2] ?? 0)];
    }
    const { x, y, z } = value;
    if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
      return [x, y, z];
    }
  }
  return null;
};

const makePositionKey = (arr) => arr.map((v) => Number(v ?? 0).toFixed(2)).join('|');

const FREE_MARKER_KEY_TO_ID = new Map();
const FREE_MARKER_ID_TO_INDEX = new Map();
FREE_MARKER_POSITIONS.forEach((marker, idx) => {
  const key = makePositionKey(marker.position);
  FREE_MARKER_KEY_TO_ID.set(key, marker.id);
  FREE_MARKER_ID_TO_INDEX.set(marker.id, idx);
});

const getMarkerIdFromPosition = (value) => {
  const arr = toPositionArray(value);
  if (!arr) return null;
  const key = makePositionKey(arr);
  return FREE_MARKER_KEY_TO_ID.get(key) ?? null;
};

const formatCarLabel = (car) => {
  if (!car) return { label: '—', strip: null };
  const color = typeof car.colorOverride === 'string' && car.colorOverride.trim().length
    ? car.colorOverride.trim()
    : null;
  return {
    label: color ? '' : '—',
    strip: color,
  };
};

const CAR_MODEL_MATERIAL_CACHE = new Map();

const getMaterialCache = (modelUrl) => {
  const key = typeof modelUrl === 'string' && modelUrl.length ? modelUrl : '__default__';
  if (!CAR_MODEL_MATERIAL_CACHE.has(key)) {
    CAR_MODEL_MATERIAL_CACHE.set(key, new Map());
  }
  return CAR_MODEL_MATERIAL_CACHE.get(key);
};

const buildMaterialKey = (material, colorOverride, highlightColor) => {
  const baseId = material && typeof material.uuid === 'string' ? material.uuid : 'material';
  const colorKey = typeof colorOverride === 'string' && colorOverride.length ? colorOverride : 'none';
  const highlightKey = typeof highlightColor === 'string' && highlightColor.length ? highlightColor : 'none';
  return `${baseId}::${colorKey}::${highlightKey}`;
};

const cloneTintedMaterial = (material, colorOverride, highlightColor) => {
  const tinted = material.clone();
  if (colorOverride && tinted.color) {
    const color = tinted.color.clone();
    color.set(colorOverride);
    tinted.color = color;
  }
  if (highlightColor) {
    const highlight = new THREE.Color(highlightColor);
    if (tinted.emissive) {
      const emissive = tinted.emissive.clone();
      emissive.set(highlight);
      tinted.emissive = emissive;
      const baseIntensity = typeof tinted.emissiveIntensity === 'number' ? tinted.emissiveIntensity : 0.75;
      tinted.emissiveIntensity = Math.max(baseIntensity, 0.75);
    } else if (tinted.color) {
      const color = tinted.color.clone();
      color.lerp(highlight, 0.35);
      tinted.color = color;
    }
  }
  tinted.needsUpdate = true;
  return tinted;
};

const resolveTintedMaterial = (modelUrl, material, colorOverride, highlightColor) => {
  if (!material || typeof material.clone !== 'function') {
    return material;
  }
  if (!colorOverride && !highlightColor) {
    return material;
  }
  const cache = getMaterialCache(modelUrl);
  const key = buildMaterialKey(material, colorOverride, highlightColor);
  if (!cache.has(key)) {
    cache.set(key, cloneTintedMaterial(material, colorOverride, highlightColor));
  }
  return cache.get(key);
};

const applyTintedMaterials = (scene, modelUrl, colorOverride, highlightColor) => {
  scene.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    if (Array.isArray(child.material)) {
      child.material = child.material.map((mat) => resolveTintedMaterial(modelUrl, mat, colorOverride, highlightColor));
      return;
    }
    child.material = resolveTintedMaterial(modelUrl, child.material, colorOverride, highlightColor);
  });
  return scene;
};
const getQueueCarModelSettings = (modelUrl) => {
  const override = modelUrl ? QUEUE_CAR_MODEL_SETTINGS[modelUrl] : null;
  const scale = Number.isFinite(override?.scale) ? override.scale : DEFAULT_QUEUE_CAR_MODEL_SETTINGS.scale;
  const rotationSource = Array.isArray(override?.rotation) && override.rotation.length === 3
    ? override.rotation
    : DEFAULT_QUEUE_CAR_MODEL_SETTINGS.rotation;
  return {
    scale,
    rotation: [rotationSource[0], rotationSource[1], rotationSource[2]],
  };
};
const pickQueueCarColor = (modelUrl) => {
  const palette = modelUrl ? QUEUE_CAR_MODEL_COLOR_OPTIONS[modelUrl] : null;
  if (!Array.isArray(palette) || !palette.length) {
    return null;
  }
  const index = Math.floor(Math.random() * palette.length);
  return palette[index] || null;
};
const pickRandomQueueCarModel = () => {
  if (!QUEUE_CAR_MODEL_PATHS.length) {
    return DEFAULT_QUEUE_CAR_MODEL;
  }
  const index = Math.floor(Math.random() * QUEUE_CAR_MODEL_PATHS.length);
  return QUEUE_CAR_MODEL_PATHS[index] || DEFAULT_QUEUE_CAR_MODEL;
};

const logQueueCarAssignment = (event, car, slotId) => {
  if (!car || !slotId) return;
  const label = typeof event === 'string' && event.length ? event : 'assignment';
  const modelPath = car.modelUrl || DEFAULT_QUEUE_CAR_MODEL;
  const colorLabel = typeof car.colorOverride === 'string' && car.colorOverride.length
    ? ` color ${car.colorOverride}`
    : '';
  console.info(`[Queue] ${label}: slot ${slotId} ← ${modelPath}${colorLabel} (car ${car.id})`);
};

const coerceSlotId = (value) => {
  if (Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length) {
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const ensureUniqueSlotAssignments = (cars, label = 'dedupe', slotPositions = QUEUE_SLOT_POSITIONS, slotLookup = QUEUE_SLOT_LOOKUP) => {
  if (!Array.isArray(cars) || cars.length <= 1) {
    return cars;
  }
  const seen = new Set();
  const available = slotPositions.map((slot) => slot.id);
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return cars.map((car) => {
    const normalizedSlotId = coerceSlotId(car.slotId);
    if (!Number.isFinite(normalizedSlotId)) {
      return car;
    }
    const baseEntry = car.slotId === normalizedSlotId ? car : { ...car, slotId: normalizedSlotId };
    if (!seen.has(normalizedSlotId)) {
      seen.add(normalizedSlotId);
      const idx = available.indexOf(normalizedSlotId);
      if (idx !== -1) {
        available.splice(idx, 1);
      }
      return baseEntry;
    }

    let fallbackSlotId = null;
    while (available.length) {
      const candidate = available.shift();
      if (!seen.has(candidate)) {
        fallbackSlotId = candidate;
        break;
      }
    }

    if (!fallbackSlotId) {
      console.warn(`[Queue] ${label}: duplicate slot ${normalizedSlotId} for car ${car.id} with no fallback slot available`);
      return baseEntry;
    }

    seen.add(fallbackSlotId);
    const fallbackPosition = clonePositionArray(slotLookup[fallbackSlotId] || QUEUE_CAR_SPAWN_POSITION);
    const reassigned = {
      ...baseEntry,
      slotId: fallbackSlotId,
      phase: QUEUE_CAR_PHASE_SLOT,
      targetOverride: clonePositionArray(fallbackPosition),
      orientationOverride: null,
      spawnTime: Math.max(now, Number.isFinite(car.spawnTime) ? car.spawnTime : now),
    };
    logQueueCarAssignment(`${label}-fallback`, reassigned, fallbackSlotId);
    return reassigned;
  });
};
const QUEUE_HOLD_GAP_MS = 260;
const QUEUE_EXIT_START_GAP_MS = 280;
const QUEUE_CLEANUP_BUFFER_MS = 600;
const QUEUE_MIN_REMOVAL_TIMELINE_SCALE = QUEUE_FAST_FORWARD_MULTIPLIER > 1 ? 1 / QUEUE_FAST_FORWARD_MULTIPLIER : 1;
const QUEUE_REJOIN_MIN_BUFFER_MS = 600;
const QUEUE_REJOIN_BUFFER_SCALE_MS = 540;
const QUEUE_EXIT_CLEAR_MIN_MS = 520;
const QUEUE_EXIT_CLEAR_SCALE = 0.06;
const getQueueTravelDuration = (slotId) => {
  if (!Number.isFinite(slotId)) {
    return QUEUE_CAR_ANIMATION_DURATION;
  }
  const base = QUEUE_CAR_ANIMATION_DURATION;
  const extra = Math.max(0, slotId - 1) * 210;
  return base + extra;
};
const getQueueRelocationDuration = (slotId) => {
  const travel = getQueueTravelDuration(slotId);
  return Math.max(1800, Math.round(travel * 0.72));
};

const clonePositionArray = (source) => {
  if (Array.isArray(source)) {
    return source.slice(0, 3);
  }
  if (source && typeof source === 'object') {
    if (Array.isArray(source.position)) {
      return source.position.slice(0, 3);
    }
    const { x, y, z } = source;
    if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
      return [x, y, z];
    }
  }
  return QUEUE_CAR_SPAWN_POSITION.slice(0, 3);
};

const buildQueueCarPath = (start, target) => {
  const toVector3 = (value) => {
    if (value instanceof THREE.Vector3) {
      return value.clone();
    }
    if (Array.isArray(value)) {
      return new THREE.Vector3(value[0] ?? 0, value[1] ?? 0, value[2] ?? 0);
    }
    if (value && typeof value === 'object') {
      const { x = 0, y = 0, z = 0 } = value;
      return new THREE.Vector3(x, y, z);
    }
    return new THREE.Vector3();
  };

  const origin = toVector3(start);
  const destination = toVector3(target);
  if (origin.distanceToSquared(destination) < 0.0001) {
    return [origin.clone(), destination.clone()];
  }

  const points = [origin.clone()];
  const baseY = Math.max(origin.y, destination.y);
  const isEnteringQueue = origin.x > 5 && destination.x < -5;
  const isExitingQueue = origin.x < -5 && destination.x > 5;
  const matchesFreeMarker = FREE_MARKER_POSITIONS.some(({ position }) => {
    const [mx, , mz] = position;
    return Math.abs(destination.x - mx) <= 0.75 && Math.abs(destination.z - mz) <= 0.75;
  });

  if (matchesFreeMarker) {
    const forwardPoint = new THREE.Vector3(origin.x, baseY, destination.z);
    if (Math.abs(destination.z - origin.z) < 1) {
      const forwardDir = destination.z >= origin.z ? 1 : -1;
      forwardPoint.z = origin.z + (forwardDir || 1) * 6;
    }

    const alignPoint = new THREE.Vector3(destination.x, baseY, destination.z);

    if (forwardPoint.distanceToSquared(points[points.length - 1]) > 1e-4) {
      points.push(forwardPoint);
    }
    if (alignPoint.distanceToSquared(forwardPoint) > 1e-4) {
      points.push(alignPoint);
    }
  } else if (isEnteringQueue) {
    const laneZOffset = destination.z >= 0 ? 12 : -12;
    const roadPoint = new THREE.Vector3(origin.x, baseY, destination.z + laneZOffset);
    const cornerOffset = Math.min(16, Math.abs(origin.x - destination.x) * 0.6);
    const cornerX = destination.x + Math.sign(origin.x - destination.x || 1) * cornerOffset;
    const cornerPoint = new THREE.Vector3(cornerX, baseY, roadPoint.z);
    const alignPoint = new THREE.Vector3(destination.x, baseY, roadPoint.z);
    points.push(roadPoint, cornerPoint, alignPoint);
  } else if (isExitingQueue) {
    const laneX = Math.min(-8, destination.x - 28);
    const lanePoint = new THREE.Vector3(laneX, baseY, origin.z);
    const zDirection = destination.z >= origin.z ? 1 : -1;
    const mergePoint = new THREE.Vector3(laneX, baseY, destination.z - (zDirection * 24));
    points.push(lanePoint, mergePoint);
  } else {
    const midpoint = origin.clone().lerp(destination, 0.5);
    const lateral = destination.clone().sub(origin);
    lateral.y = 0;
    const lateralLength = lateral.length();
    const bendStrength = Math.min(12, lateralLength * 0.25);
    const lateralDir = lateralLength > 0 ? new THREE.Vector3(lateral.z, 0, -lateral.x).normalize() : new THREE.Vector3();
    const bendOffset = lateralDir.multiplyScalar(bendStrength);
    const entry = origin.clone();
    entry.y = baseY;
    const apex = midpoint.clone().add(bendOffset);
    apex.y = baseY + 0.4;
    points.push(entry, apex);
  }

  points.push(destination.clone());

  for (let i = 1; i < points.length - 1; i += 1) {
    points[i].y = Math.max(points[i].y, baseY + (matchesFreeMarker ? 0.01 : 0.05));
  }

  for (let i = points.length - 2; i >= 1; i -= 1) {
    if (points[i].distanceToSquared(points[i + 1]) < 1e-4) {
      points.splice(i, 1);
    }
  }

  if (points.length < 4) {
    const filler = origin.clone().lerp(destination, 0.5);
    filler.y = baseY + 0.22;
    points.splice(1, 0, filler);
  }

  return points;
};

const STACK_MARKER_POSITION = [-40, 0.08, 19];
const STACK_MARKER_SIZE = 7;
const QUEUE_MARKER_POSITION = [40, 0.08, -19];
const QUEUE_MARKER_SIZE = 7;
const INTERACT_MARKER_POSITION = [40, 0.2, -53];
const INTERACT_MARKER_SIZE = 6.5;
const STREET_ROAD_POSITION = [37, 0.02, -585];
const STREET_ROAD_ROTATION = [0, Math.PI, 0];
const STREET_ROAD_SCALE = 1.7; // tweak these three constants to align the road with the garage
const PARKING_TOLL_POSITION = [22, 0.4, -48];
const PARKING_TOLL_ROTATION = [0, Math.PI * 0.5, 0];
const PARKING_TOLL_SCALE = 2; // adjust these to line the toll booth up with the roadway
const ROAD_BARRIER_POSITION = [38, 0.02, -48];
const ROAD_BARRIER_ROTATION = [0, Math.PI * 0, 0];
const ROAD_BARRIER_SCALE = 5; // tweak to align barrier with the entrance
const SECURITY_GUARD_POSITION = [30, 3, -55];
const SECURITY_GUARD_ROTATION = [0, Math.PI * 0.5, 0];
const SECURITY_GUARD_SCALE = 1.1;
const SECURITY_GUARD_MODEL_PATH = '/security/security_guard2.glb';
const SECURITY_GUARD_CAMERA_POSITION = [36, 7.2, -50];
const SECURITY_GUARD_CAMERA_LOOK_AT = [SECURITY_GUARD_POSITION[0], SECURITY_GUARD_POSITION[1] + 1.6, SECURITY_GUARD_POSITION[2]];
const SECURITY_GUARD_BUBBLE_IMAGE = '/security/security_guard_bubble.png';
const SECURITY_GUARD_SMILING_BUBBLE_IMAGE = '/security/security_guard_smiling_bubble.png';
const SECURITY_GUARD_TALKING_SFX = '/security/npc_talking.mp3';
const CAMERA_TRANSITION_DURATION = 0.9;
const INTERACT_CAMERA_PHASES = new Set(['prompt', 'handover', 'checking']);
const STACK_COUNTDOWN_START = 3;
const COUNTDOWN_MODEL_SCALE = 4;
const BARRIER_OPEN_ANGLE = 0.9;
const COUNTDOWN_MODELS = {
  3: '/models/3.glb',
  2: '/models/2.glb',
  1: '/models/1.glb',
};
const MARKER_SFX_URL = '/marker_sfx.mp3';
const COUNTDOWN_SFX_URL = '/321countdown.mp3';
const STACK_MARKER_COLORS = Object.freeze({
  plane: {
    color: '#2fffc0',
    emissive: '#12c68e',
    intensity: { active: 1.4, inactive: 0.6 },
  },
  frame: {
    color: '#46ffd4',
    emissive: '#2af8b2',
    intensity: { active: 0.9, inactive: 0.4 },
  },
  baseLine: {
    active: '#7dffe2',
    inactive: '#3affc4',
  },
  upperLine: {
    active: '#ffffff',
    inactive: '#aaffe8',
  },
  lowerLine: {
    active: '#b9fff0',
    inactive: '#6effd0',
  },
  text: {
    color: '#ffffff',
    outline: '#1b8064',
  },
  stripe: {
    base: 'rgba(50, 255, 185, 0.12)',
    highlight: 'rgba(50, 255, 185, 0.55)',
  },
});
const QUEUE_MARKER_COLORS = Object.freeze({
  plane: {
    color: '#ffbd66',
    emissive: '#d97500',
    intensity: { active: 1.35, inactive: 0.55 },
  },
  frame: {
    color: '#ffc978',
    emissive: '#ff8c1a',
    intensity: { active: 0.95, inactive: 0.45 },
  },
  baseLine: {
    active: '#ffe1ad',
    inactive: '#ffb764',
  },
  upperLine: {
    active: '#fff3d6',
    inactive: '#ffcfa0',
  },
  lowerLine: {
    active: '#ffd9a1',
    inactive: '#ffae59',
  },
  text: {
    color: '#ffffff',
    outline: '#8a4d00',
  },
  stripe: {
    base: 'rgba(255, 196, 120, 0.12)',
    highlight: 'rgba(255, 153, 0, 0.55)',
  },
});
const INTERACT_MARKER_COLORS = Object.freeze({
  plane: {
    color: '#6fb8ff',
    emissive: '#2265d8',
    intensity: { active: 1.4, inactive: 0.55 },
  },
  frame: {
    color: '#8accff',
    emissive: '#3e8bff',
    intensity: { active: 1, inactive: 0.45 },
  },
  baseLine: {
    active: '#d1e7ff',
    inactive: '#8fc2ff',
  },
  upperLine: {
    active: '#f0f6ff',
    inactive: '#b5d7ff',
  },
  lowerLine: {
    active: '#b7d8ff',
    inactive: '#7db7ff',
  },
  text: {
    color: '#ffffff',
    outline: '#1b3c66',
  },
  stripe: {
    base: 'rgba(110, 180, 255, 0.12)',
    highlight: 'rgba(70, 132, 238, 0.55)',
  },
});
const LICENSE_STORAGE_KEY = 'algohub-license-card-path';
const LICENSE_EVENT = 'algohub-license-card-updated';
const DEFAULT_LICENSE_IMAGE = '/drivers_license.png';
const DEFAULT_LICENSE_STATS = Object.freeze({ arrivals: 0, departures: 0 });
const STACK_CAR_TOOLTIP_OFFSET = Object.freeze([0, 5, 0]);
const STACK_CAR_TOOLTIP_SCALE = 2;
const STACK_CAR_TOOLTIP_BACKGROUND = Object.freeze({
  width: 3.4,
  height: 1.8,
  depth: 0.04,
  radius: 0.32,
  color: '#020617',
  emissive: '#0f172a',
  emissiveIntensity: 0.42,
  opacity: 0.82,
});
const QUEUE_CAR_TOOLTIP_OFFSET = Object.freeze([0, 5, 0]);
const QUEUE_CAR_TOOLTIP_SCALE = 2;
const QUEUE_CAR_TOOLTIP_BACKGROUND = Object.freeze({
  width: 3.2,
  height: 1.7,
  depth: 0.04,
  radius: 0.3,
  color: '#011b2c',
  emissive: '#082f49',
  emissiveIntensity: 0.38,
  opacity: 0.8,
});

function CarModel({ modelUrl = DEFAULT_QUEUE_CAR_MODEL, colorOverride = null, highlightColor = null, ...props }) {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => {
    const cloned = scene.clone(true);
    if (colorOverride || highlightColor) {
      applyTintedMaterials(cloned, modelUrl, colorOverride, highlightColor);
    }
    return cloned;
  }, [scene, modelUrl, colorOverride, highlightColor]);
  return <primitive object={clonedScene} {...props} />;
}

function Car({ onSpeedChange, carRef, controlsEnabled = true }) {
  const internalRef = useRef();
    const ref = carRef || internalRef;
  const vel = useRef(0);
  const heading = useRef(0);
  // Web Audio engine: more reliable playback and smooth fades
  const audioCtxRef = useRef(null);
  const gainRef = useRef(null);
  const bufferRef = useRef(null);
  const sourceRef = useRef(null);
  const brakeGainRef = useRef(null);
  const brakeBufferRef = useRef(null);
  const brakeSourceRef = useRef(null);
  // Reverse sound refs
  const reverseGainRef = useRef(null);
  const reverseBufferRef = useRef(null);
  const reverseSourceRef = useRef(null);
  const unlockedRef = useRef(false);
  const loadingRef = useRef(false);
  const lastMovingRef = useRef(false);
  const controlsEnabledRef = useRef(controlsEnabled);

  useEffect(() => {
    controlsEnabledRef.current = controlsEnabled;
    if (!controlsEnabled) {
      vel.current = 0;
    }
  }, [controlsEnabled]);

  // Setup unlock and preload buffer after first gesture
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ensureCtx = () => {
      if (audioCtxRef.current) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) { console.warn('[CarAudio] Web Audio API not supported'); return; }
      audioCtxRef.current = new Ctx();
      const g = audioCtxRef.current.createGain();
      g.gain.value = 0;
      g.connect(audioCtxRef.current.destination);
      gainRef.current = g;
    };
    const preload = async () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      const ctx = audioCtxRef.current;
      try {
        if (!bufferRef.current) {
          const res = await fetch('/car-audio/car_driving_sfx2.mp3', { cache: 'force-cache' });
          const ab = await res.arrayBuffer();
          if (ctx) bufferRef.current = await ctx.decodeAudioData(ab.slice(0));
        }
        if (!brakeBufferRef.current) {
          const res2 = await fetch('/car-audio/car_brake.mp3', { cache: 'force-cache' });
          const ab2 = await res2.arrayBuffer();
          if (ctx) brakeBufferRef.current = await ctx.decodeAudioData(ab2.slice(0));
        }
        if (!reverseBufferRef.current) {
          const res3 = await fetch('/car-audio/car_reverse.mp3', { cache: 'force-cache' });
          const ab3 = await res3.arrayBuffer();
          if (ctx) reverseBufferRef.current = await ctx.decodeAudioData(ab3.slice(0));
        }
      } catch (e) {
        console.warn('[CarAudio] Failed to preload audio', e);
      } finally {
        loadingRef.current = false;
      }
    };
    const unlock = async () => {
      try {
        ensureCtx();
        if (!audioCtxRef.current) return;
        await audioCtxRef.current.resume().catch(() => {});
        unlockedRef.current = true;
        preload();
      } catch {}
      try { window.removeEventListener('pointerdown', unlock); } catch {}
      try { window.removeEventListener('keydown', unlock); } catch {}
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      try { window.removeEventListener('pointerdown', unlock); } catch {}
      try { window.removeEventListener('keydown', unlock); } catch {}
    };
  }, []);

  const ensureEnginePlaying = () => {
    const ctx = audioCtxRef.current;
    if (!ctx || !gainRef.current || !bufferRef.current) return false;
    if (sourceRef.current) return true;
    try {
      const src = ctx.createBufferSource();
      src.buffer = bufferRef.current;
      src.loop = true;
      src.connect(gainRef.current);
      src.start(0);
      sourceRef.current = src;
      return true;
    } catch (e) {
      console.debug('[CarAudio] Failed to start buffer source', e);
      return false;
    }
  };

  const ensureBrakePlaying = () => {
    const ctx = audioCtxRef.current;
    if (!ctx || !brakeGainRef.current || !brakeBufferRef.current) return false;
    if (brakeSourceRef.current) return true;
    try {
      const src = ctx.createBufferSource();
      src.buffer = brakeBufferRef.current;
      src.loop = true;
      src.connect(brakeGainRef.current);
      src.start(0);
      brakeSourceRef.current = src;
      return true;
    } catch (e) {
      console.debug('[CarAudio] Failed to start brake source', e);
      return false;
    }
  };

  const ensureReversePlaying = () => {
    const ctx = audioCtxRef.current;
    if (!ctx || !reverseGainRef.current || !reverseBufferRef.current) return false;
    if (reverseSourceRef.current) return true;
    try {
      const src = ctx.createBufferSource();
      src.buffer = reverseBufferRef.current;
      src.loop = true;
      src.connect(reverseGainRef.current);
      src.start(0);
      reverseSourceRef.current = src;
      return true;
    } catch (e) {
      console.debug('[CarAudio] Failed to start reverse source', e);
      return false;
    }
  };

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;

    const controlsAllowed = !!controlsEnabledRef.current;
    const joystick = getJoystickVector();
    const jx = controlsAllowed ? joystick.x : 0;
    const jy = controlsAllowed ? joystick.y : 0;
    const joystickMagnitude = controlsAllowed ? Math.hypot(jx, jy) : 0;
    let joystickActive = controlsAllowed && joystickMagnitude > JOYSTICK_DEADZONE;

    const keyboardForward = controlsAllowed ? (key('w') || key('arrowup')) : false;
    const keyboardBackward = controlsAllowed ? (key('s') || key('arrowdown')) : false;
    const keyboardLeft = controlsAllowed ? (key('a') || key('arrowleft')) : false;
    const keyboardRight = controlsAllowed ? (key('d') || key('arrowright')) : false;
    const usingKeyboard = controlsAllowed && (keyboardForward || keyboardBackward || keyboardLeft || keyboardRight);

    let forwardInput = 0;
    let backwardInput = 0;
    let leftInput = 0;
    let rightInput = 0;

    if (controlsAllowed && joystickActive && !usingKeyboard) {
      const direction = Math.min(1, joystickMagnitude);
      if (direction > JOYSTICK_DEADZONE) {
        const vertical = -jy;
        const targetHeading = Math.atan2(-jx, Math.abs(vertical) < 1e-4 && Math.abs(jx) < 1e-4 ? 1e-4 : vertical);
        const angleDiff = normalizeAngle(targetHeading - heading.current);
        const turnSpeed = (4.5 * dt) * (0.55 + direction * 0.75);
        heading.current += THREE.MathUtils.clamp(angleDiff, -turnSpeed, turnSpeed);
        const rotationFactor = Math.max(0.12, Math.cos(Math.min(Math.PI, Math.abs(angleDiff))));
        const desiredSpeed = direction * 13 * rotationFactor;
        vel.current = THREE.MathUtils.damp(vel.current, desiredSpeed, 5, dt);
        forwardInput = direction;
        leftInput = angleDiff < -0.01 ? Math.min(1, Math.abs(angleDiff) / Math.PI) : 0;
        rightInput = angleDiff > 0.01 ? Math.min(1, Math.abs(angleDiff) / Math.PI) : 0;
      } else {
        vel.current = THREE.MathUtils.damp(vel.current, 0, 6, dt);
      }
    } else if (controlsAllowed) {
      const joystickForward = joystickActive ? Math.max(0, -jy) : 0;
      const joystickBackward = joystickActive ? Math.max(0, jy) : 0;
      const joystickLeft = joystickActive ? Math.max(0, -jx) : 0;
      const joystickRight = joystickActive ? Math.max(0, jx) : 0;

      forwardInput = keyboardForward ? 1 : joystickForward;
      backwardInput = keyboardBackward ? 1 : joystickBackward;
      leftInput = keyboardLeft ? 1 : joystickLeft;
      rightInput = keyboardRight ? 1 : joystickRight;

      const accel = 10;
      const decel = 12;
      if (forwardInput > 0) {
        vel.current = Math.min(vel.current + accel * Math.max(0.35, forwardInput) * dt, 14);
      } else if (backwardInput > 0) {
        vel.current = Math.max(vel.current - accel * Math.max(0.35, backwardInput) * dt, -8);
      } else {
        if (vel.current > 0) vel.current = Math.max(0, vel.current - decel * dt);
        else if (vel.current < 0) vel.current = Math.min(0, vel.current + decel * dt);
      }

      const movementIntensity = Math.max(Math.abs(vel.current) / 6, forwardInput * 0.55, backwardInput * 0.5);
      const turnScale = Math.max(0.25, Math.min(1, movementIntensity));
      const turnRate = 2.4 * turnScale;
      const turnInput = THREE.MathUtils.clamp(rightInput - leftInput, -1, 1);
      if (Math.abs(turnInput) > 0.001) {
        heading.current -= turnRate * turnInput * dt;
      }
    } else {
      joystickActive = false;
      if (Math.abs(vel.current) > 0.001) {
        vel.current = 0;
      }
    }

    g.rotation.y = heading.current;

    // Movement direction: model appears oriented toward +Z, so use +Z as "forward".
    const forwardMove = new THREE.Vector3(0, 0, 1).applyEuler(g.rotation).multiplyScalar(vel.current * dt);
    g.position.add(forwardMove);

    // Engine/brake/reverse audio behavior via Web Audio
    const speedVal = vel.current;
    const speedAbs = Math.abs(speedVal);
    const moving = speedAbs > 0.25;
    const reversing = speedVal < -0.25;
    const ctx = audioCtxRef.current;
    const gain = gainRef.current;
    const braking = usingKeyboard ? backwardInput > 0 : (joystickActive && jy > 0.35);
    if (unlockedRef.current && ctx && gain && bufferRef.current) {
      if (braking) {
        // Fade engine out quickly when braking
        try {
          const t = ctx.currentTime;
          gain.gain.cancelScheduledValues(t);
          gain.gain.setTargetAtTime(0, t, 0.08);
        } catch {}
        if (moving && speedVal > 0) {
          // Forward braking: play brake, not reverse
          if (!brakeGainRef.current) {
            const bg = ctx.createGain();
            bg.gain.value = 0;
            bg.connect(ctx.destination);
            brakeGainRef.current = bg;
          }
          if (ensureBrakePlaying()) {
            const targetBrake = Math.min(0.9, 0.4 + (speedAbs / 14) * 0.5);
            try {
              const t2 = ctx.currentTime;
              brakeGainRef.current.gain.cancelScheduledValues(t2);
              brakeGainRef.current.gain.setTargetAtTime(targetBrake, t2, 0.05);
            } catch {}
          }
          // Fade reverse out if present
          if (reverseGainRef.current) {
            try {
              const t3 = ctx.currentTime;
              reverseGainRef.current.gain.cancelScheduledValues(t3);
              reverseGainRef.current.gain.setTargetAtTime(0, t3, 0.1);
            } catch {}
          }
        } else if (reversing) {
          // Into reverse: stop brake and play reverse while S held
          if (brakeGainRef.current) {
            try {
              const t4 = ctx.currentTime;
              brakeGainRef.current.gain.cancelScheduledValues(t4);
              brakeGainRef.current.gain.setTargetAtTime(0, t4, 0.08);
            } catch {}
          }
          if (!reverseGainRef.current) {
            const rg = ctx.createGain();
            rg.gain.value = 0;
            rg.connect(ctx.destination);
            reverseGainRef.current = rg;
          }
            if (ensureReversePlaying()) {
              const targetRev = Math.min(0.85, 0.35 + (speedAbs / 8) * 0.5);
              try {
                const t5 = ctx.currentTime;
                reverseGainRef.current.gain.cancelScheduledValues(t5);
                reverseGainRef.current.gain.setTargetAtTime(targetRev, t5, 0.08);
              } catch {}
            }
        } else {
          // Near zero: fade brake & reverse down
          if (brakeGainRef.current) {
            try {
              const t6 = ctx.currentTime;
              brakeGainRef.current.gain.cancelScheduledValues(t6);
              brakeGainRef.current.gain.setTargetAtTime(0, t6, 0.08);
            } catch {}
          }
          if (reverseGainRef.current) {
            try {
              const t7 = ctx.currentTime;
              reverseGainRef.current.gain.cancelScheduledValues(t7);
              reverseGainRef.current.gain.setTargetAtTime(0, t7, 0.08);
            } catch {}
          }
        }
      } else {
        // Normal engine logic
        if (moving && !reversing) {
          if (ensureEnginePlaying()) {
            const target = Math.min(0.85, 0.25 + (speedAbs / 14) * 0.6);
            try {
              const t = ctx.currentTime;
              gain.gain.cancelScheduledValues(t);
              gain.gain.setTargetAtTime(target, t, 0.12);
            } catch {}
          }
        } else if (lastMovingRef.current && !moving) {
          try {
            const t = ctx.currentTime;
            gain.gain.cancelScheduledValues(t);
            gain.gain.setTargetAtTime(0, t, 0.2);
          } catch {}
        }
        // If brake gain exists, fade it out
        if (brakeGainRef.current) {
          try {
            const t3 = ctx.currentTime;
            brakeGainRef.current.gain.cancelScheduledValues(t3);
            brakeGainRef.current.gain.setTargetAtTime(0, t3, 0.15);
          } catch {}
        }
        // Fade reverse out if not reversing
        if (reverseGainRef.current && !reversing) {
          try {
            const t8 = ctx.currentTime;
            reverseGainRef.current.gain.cancelScheduledValues(t8);
            reverseGainRef.current.gain.setTargetAtTime(0, t8, 0.15);
          } catch {}
        }
      }
    }
    lastMovingRef.current = moving;

    // Report speed upward (throttle updates)
    if (typeof onSpeedChange === 'function') {
      if (!Car._lastReport) Car._lastReport = 0;
      if (Math.abs(Car._lastReport - speedVal) > 0.02) {
        Car._lastReport = speedVal;
        try { onSpeedChange(speedVal); } catch {}
      }
    }
  });

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      try { if (sourceRef.current) sourceRef.current.stop(0); } catch {}
      try { if (sourceRef.current) sourceRef.current.disconnect(); } catch {}
      try { if (gainRef.current) gainRef.current.disconnect(); } catch {}
      try { if (brakeSourceRef.current) brakeSourceRef.current.stop(0); } catch {}
      try { if (brakeSourceRef.current) brakeSourceRef.current.disconnect(); } catch {}
      try { if (brakeGainRef.current) brakeGainRef.current.disconnect(); } catch {}
      sourceRef.current = null;
      gainRef.current = null;
      brakeSourceRef.current = null;
      brakeGainRef.current = null;
      try { if (reverseSourceRef.current) reverseSourceRef.current.stop(0); } catch {}
      try { if (reverseSourceRef.current) reverseSourceRef.current.disconnect(); } catch {}
      try { if (reverseGainRef.current) reverseGainRef.current.disconnect(); } catch {}
      reverseSourceRef.current = null;
      reverseGainRef.current = null;
      // Do not close AudioContext to avoid interfering with other audio; leave it for GC
    };
  }, []);

  return (
    <group ref={ref} position={[40, 0.3, -100]}>
      <CarModel scale={0.01} />
    </group>
  );
}

function CameraRig({ targetRef, mode, stackTarget, queueTarget, interactTarget, interactActive }) {
  const { camera } = useThree();
  const smoothPos = useRef(new THREE.Vector3());
  const initialized = useRef(false);
  const followOffset = useMemo(() => new THREE.Vector3(0, 9, -16), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const tempOffset = useMemo(() => new THREE.Vector3(), []);
  const lookAtPos = useRef(new THREE.Vector3());
  const desiredPos = useRef(new THREE.Vector3());
  const preInteractPosRef = useRef(new THREE.Vector3());
  const preInteractLookAtRef = useRef(new THREE.Vector3());
  const lastInteractLookAtRef = useRef(new THREE.Vector3());
  const transitionFromPosRef = useRef(new THREE.Vector3());
  const transitionFromLookAtRef = useRef(new THREE.Vector3());
  const transitionToPosRef = useRef(new THREE.Vector3());
  const transitionToLookAtRef = useRef(new THREE.Vector3());
  const transitionStartRef = useRef(0);
  const transitionDuration = CAMERA_TRANSITION_DURATION;
  const transitioningRef = useRef(false);
  const toInteractRef = useRef(false);
  const transitionPos = useMemo(() => new THREE.Vector3(), []);
  const transitionLook = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    initialized.current = false;
  }, [mode]);

  useFrame(() => {
    const target = targetRef.current;
    if (!target) return;
    target.getWorldPosition(lookAtPos.current);

    const now = performance.now() / 1000;

    if (interactActive && interactTarget) {
      if (!toInteractRef.current) {
        toInteractRef.current = true;
        transitionStartRef.current = now;
        target.getWorldPosition(preInteractLookAtRef.current);
        preInteractPosRef.current.copy(camera.position);
        transitionFromPosRef.current.copy(camera.position);
        transitionFromLookAtRef.current.copy(preInteractLookAtRef.current);
        transitionToPosRef.current.copy(interactTarget.position);
        transitionToLookAtRef.current.copy(interactTarget.lookAt);
        transitioningRef.current = true;
      }
      const elapsed = now - transitionStartRef.current;
      const t = transitioningRef.current ? Math.min(1, elapsed / transitionDuration) : 1;
      const eased = t * t * (3 - 2 * t);
      lookAtPos.current.copy(interactTarget.lookAt);
      if (transitioningRef.current) {
        transitionPos.copy(transitionFromPosRef.current).lerp(transitionToPosRef.current, eased);
        transitionLook.copy(transitionFromLookAtRef.current).lerp(transitionToLookAtRef.current, eased);
        camera.position.copy(transitionPos);
        camera.lookAt(transitionLook);
        if (t >= 1) {
          transitioningRef.current = false;
        }
      } else {
        camera.position.copy(interactTarget.position);
        camera.lookAt(interactTarget.lookAt);
      }
      lastInteractLookAtRef.current.copy(interactTarget.lookAt);
      return;
    }

    if (toInteractRef.current) {
      toInteractRef.current = false;
      transitioningRef.current = true;
      transitionStartRef.current = now;
      transitionFromPosRef.current.copy(camera.position);
      transitionFromLookAtRef.current.copy(lastInteractLookAtRef.current);
      transitionToPosRef.current.copy(preInteractPosRef.current);
      transitionToLookAtRef.current.copy(lookAtPos.current);
    }

    if (transitioningRef.current) {
      const elapsed = now - transitionStartRef.current;
      const t = Math.min(1, elapsed / transitionDuration);
      const eased = t * t * (3 - 2 * t);
      transitionPos.copy(transitionFromPosRef.current).lerp(transitionToPosRef.current, eased);
      transitionLook.copy(transitionFromLookAtRef.current).lerp(transitionToLookAtRef.current, eased);
      camera.position.copy(transitionPos);
      camera.lookAt(transitionLook);
      if (t >= 1) {
        transitioningRef.current = false;
        smoothPos.current.copy(transitionToPosRef.current);
        lookAtPos.current.copy(transitionToLookAtRef.current);
        initialized.current = true;
      }
      return;
    }

    if (mode === 'stack' && stackTarget) {
      desiredPos.current.copy(stackTarget.position);
      lookAtPos.current.copy(stackTarget.lookAt);
      if (!initialized.current) {
        smoothPos.current.copy(desiredPos.current);
        initialized.current = true;
      } else {
        smoothPos.current.lerp(desiredPos.current, 0.18);
      }
    } else if (mode === 'queue' && queueTarget) {
      desiredPos.current.copy(queueTarget.position);
      lookAtPos.current.copy(queueTarget.lookAt);
      if (!initialized.current) {
        smoothPos.current.copy(desiredPos.current);
        initialized.current = true;
      } else {
        smoothPos.current.lerp(desiredPos.current, 0.18);
      }
    } else {
      target.getWorldQuaternion(tempQuaternion);
      tempOffset.copy(followOffset).applyQuaternion(tempQuaternion);
      desiredPos.current.copy(lookAtPos.current).add(tempOffset);
      if (!initialized.current) {
        smoothPos.current.copy(desiredPos.current);
        initialized.current = true;
      } else {
        smoothPos.current.lerp(desiredPos.current, 0.12);
      }
    }

    camera.position.copy(smoothPos.current);
    camera.lookAt(lookAtPos.current);
  });
  return null;
}

function ParkingArea() {
  const { scene } = useGLTF('/models/modern_parking_area.glb');
  const parkingScene = useMemo(() => {
    const cloned = scene.clone(true);
    const tempBox = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    tempBox.getSize(size);
    const targetSpan = 150;
    const maxSpan = Math.max(size.x || 1, size.z || 1);
    const scale = maxSpan > 0 ? targetSpan / maxSpan : 1;
    cloned.scale.setScalar(scale);
    cloned.updateMatrixWorld(true);

    const adjustedBox = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    adjustedBox.getCenter(center);
    const minY = adjustedBox.min.y;
    cloned.position.set(-center.x, -minY, -center.z);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);
  return <primitive object={parkingScene} />;
}

function StreetRoad() {
  const { scene } = useGLTF('/models/street_road.glb');
  const roadScene = useMemo(() => {
    const cloned = scene.clone(true);
    const tempBox = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    tempBox.getCenter(center);
    const minY = tempBox.min.y;
    cloned.position.set(-center.x, -minY, -center.z);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  return (
    <group position={STREET_ROAD_POSITION} rotation={STREET_ROAD_ROTATION} scale={STREET_ROAD_SCALE}>
      <primitive object={roadScene} />
    </group>
  );
}

function ParkingToll() {
  const { scene } = useGLTF('/models/parking_toll.glb');
  const tollScene = useMemo(() => {
    const cloned = scene.clone(true);
    const tempBox = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    tempBox.getCenter(center);
    const minY = tempBox.min.y;
    cloned.position.set(-center.x, -minY, -center.z);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  return (
    <group position={PARKING_TOLL_POSITION} rotation={PARKING_TOLL_ROTATION} scale={PARKING_TOLL_SCALE}>
      <primitive object={tollScene} />
    </group>
  );
}

function RoadBarrier({ open = false }) {
  const { scene } = useGLTF('/models/road_barrier.glb');
  const barrierScene = useMemo(() => {
    const cloned = scene.clone(true);
    const tempBox = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    tempBox.getCenter(center);
    const minY = tempBox.min.y;
    cloned.position.set(-center.x, -minY, -center.z);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  const pivotRef = useRef(null);
  const progressRef = useRef(open ? 1 : 0);
  const targetRef = useRef(0);

  useEffect(() => {
    targetRef.current = open ? 1 : 0;
  }, [open]);

  useFrame((_, dt) => {
    const pivot = pivotRef.current;
    if (!pivot) return;
    const lerpSpeed = open ? 6 : 4;
    progressRef.current = THREE.MathUtils.damp(progressRef.current, targetRef.current, lerpSpeed, dt);
    const eased = easeOutCubic(progressRef.current);
    const angle = eased * BARRIER_OPEN_ANGLE;
    pivot.rotation.set(0, 0, angle);
  });

  return (
    <group position={ROAD_BARRIER_POSITION} rotation={ROAD_BARRIER_ROTATION} scale={ROAD_BARRIER_SCALE}>
      <group ref={pivotRef}>
        <primitive object={barrierScene} />
      </group>
    </group>
  );
}

function SecurityGuard() {
  const { scene } = useGLTF(SECURITY_GUARD_MODEL_PATH);
  const guardScene = useMemo(() => {
    const cloned = scene.clone(true);
    const tempBox = new THREE.Box3().setFromObject(cloned);
    const center = new THREE.Vector3();
    tempBox.getCenter(center);
    cloned.position.sub(center);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
    return cloned;
  }, [scene]);

  return (
    <group position={SECURITY_GUARD_POSITION} rotation={SECURITY_GUARD_ROTATION} scale={SECURITY_GUARD_SCALE}>
      <primitive object={guardScene} />
    </group>
  );
}

function GameMarker({
  label,
  position = STACK_MARKER_POSITION,
  size = STACK_MARKER_SIZE,
  carRef,
  onPresenceChange,
  active = false,
  colors = STACK_MARKER_COLORS,
}) {
  const planeSize = useMemo(() => [size, size], [size]);
  const textFontSize = useMemo(() => size * 0.12, [size]);
  const outerFrameMaterialRef = useRef(null);
  const stripeTextureRef = useRef(null);
  const outerFrameGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    const half = size * 0.55;
    shape.moveTo(-half, -half);
    shape.lineTo(half, -half);
    shape.lineTo(half, half);
    shape.lineTo(-half, half);
    shape.lineTo(-half, -half);
    const hole = new THREE.Path();
    const inner = size * 0.4;
    hole.moveTo(-inner, -inner);
    hole.lineTo(-inner, inner);
    hole.lineTo(inner, inner);
    hole.lineTo(inner, -inner);
    hole.lineTo(-inner, -inner);
    shape.holes.push(hole);
    return new THREE.ShapeGeometry(shape, 1);
  }, [size]);
  const upperOutlineGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size * 0.88, size * 0.88)), [size]);
  const lowerOutlineGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size * 0.7, size * 0.7)), [size]);
  const baseOutlineGeometry = useMemo(() => new THREE.EdgesGeometry(new THREE.PlaneGeometry(size, size)), [size]);
  const lastInsideRef = useRef(false);
  const liftGroupRef = useRef(null);
  const liftValueRef = useRef(0.14);
  const baseLift = 0.14;
  const raisedLift = baseLift + 0.12;
  const scrollSpeed = 0.45;
  const {
    plane = {
      color: '#ffffff',
      emissive: '#ffffff',
      intensity: { active: 1, inactive: 1 },
    },
    frame = {
      color: '#ffffff',
      emissive: '#ffffff',
      intensity: { active: 1, inactive: 1 },
    },
    baseLine = { active: '#ffffff', inactive: '#999999' },
    upperLine = { active: '#ffffff', inactive: '#cccccc' },
    lowerLine = { active: '#ffffff', inactive: '#bbbbbb' },
    text = { color: '#ffffff', outline: '#000000' },
    stripe = { base: 'rgba(255,255,255,0.12)', highlight: 'rgba(255,255,255,0.5)' },
  } = colors || {};
  const stripeBaseColor = stripe.base;
  const stripeHighlightColor = stripe.highlight;

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }
    if (stripeTextureRef.current) {
      stripeTextureRef.current.dispose();
      stripeTextureRef.current = null;
    }
    const canvas = document.createElement('canvas');
    const px = 128;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, px, px);
      ctx.fillStyle = stripeBaseColor;
      ctx.fillRect(0, 0, px, px);
      ctx.save();
      ctx.translate(px / 2, px / 2);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = stripeHighlightColor;
      const band = px * 0.34;
      ctx.fillRect(-px, -band / 2, px * 2, band);
      ctx.translate(0, px * 0.75);
      ctx.fillRect(-px, -band / 2, px * 2, band);
      ctx.restore();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.center.set(0.5, 0.5);
    texture.rotation = Math.PI / 4;
    texture.anisotropy = 4;
    stripeTextureRef.current = texture;
    const material = outerFrameMaterialRef.current;
    if (material) {
      material.map = texture;
      material.needsUpdate = true;
    }
    return () => {
      texture.dispose();
      stripeTextureRef.current = null;
      if (material && material.map === texture) {
        material.map = null;
      }
    };
  }, [stripeBaseColor, stripeHighlightColor]);

  useEffect(() => {
    if (liftGroupRef.current) {
      liftGroupRef.current.position.y = liftValueRef.current;
    }
  }, []);

  useFrame((_, dt) => {
    const car = carRef?.current;
    if (!car) return;
    const carPos = car.position;
    const half = size * 0.5;
    const dx = carPos.x - position[0];
    const dz = carPos.z - position[2];
    const dy = Math.abs((carPos.y || 0) - (position[1] || 0));
    const inside = Math.abs(dx) <= half && Math.abs(dz) <= half && dy <= 2.2;
    if (inside !== lastInsideRef.current) {
      lastInsideRef.current = inside;
      if (typeof onPresenceChange === 'function') {
        onPresenceChange(inside);
      }
    }

    const targetLift = active ? raisedLift : baseLift;
    const lerpFactor = Math.min(1, dt * 6.5);
    liftValueRef.current = THREE.MathUtils.lerp(liftValueRef.current, targetLift, lerpFactor);
    if (liftGroupRef.current) {
      liftGroupRef.current.position.y = liftValueRef.current;
    }

    if (stripeTextureRef.current) {
      stripeTextureRef.current.offset.x = (stripeTextureRef.current.offset.x + dt * scrollSpeed) % 1;
      stripeTextureRef.current.needsUpdate = true;
    }
  });

  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
        <planeGeometry args={planeSize} />
        <meshStandardMaterial
          color={plane.color}
          emissive={plane.emissive}
          emissiveIntensity={active ? plane.intensity.active : plane.intensity.inactive}
          roughness={0.35}
          metalness={0.1}
          opacity={0.25}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
      <group ref={liftGroupRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} geometry={outerFrameGeometry}>
          <meshStandardMaterial
            ref={outerFrameMaterialRef}
            color={frame.color}
            emissive={frame.emissive}
            emissiveIntensity={active ? frame.intensity.active : frame.intensity.inactive}
            transparent
            opacity={0.55}
            side={THREE.DoubleSide}
          />
        </mesh>
        <lineSegments rotation={[-Math.PI / 2, 0, 0]} geometry={baseOutlineGeometry} position={[0, -0.11, 0]}>
          <lineBasicMaterial color={active ? baseLine.active : baseLine.inactive} linewidth={1} />
        </lineSegments>
        <lineSegments rotation={[-Math.PI / 2, 0, 0]} geometry={upperOutlineGeometry} position={[0, 0.08, 0]}>
          <lineBasicMaterial color={active ? upperLine.active : upperLine.inactive} linewidth={1} />
        </lineSegments>
        <lineSegments rotation={[-Math.PI / 2, 0, 0]} geometry={lowerOutlineGeometry} position={[0, -0.04, 0]}>
          <lineBasicMaterial color={active ? lowerLine.active : lowerLine.inactive} linewidth={1} />
        </lineSegments>
        <Text
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.1, 0]}
          fontSize={textFontSize}
          color={text.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.08}
          outlineColor={text.outline}
          letterSpacing={0.12}
        >
          {label}
        </Text>
      </group>
    </group>
  );
}

function FloatingCountdown({ carRef, countdown, active }) {
  const groupRef = useRef(null);
  const offset = useMemo(() => new THREE.Vector3(0, 4.5, 0), []);
  const lerpTarget = useRef(new THREE.Vector3());
  const smoothPos = useRef(new THREE.Vector3());
  const initializedRef = useRef(false);
  const scaleValueRef = useRef(0);
  const rotationOffsetRef = useRef(0);
  const lookTargetRef = useRef(new THREE.Vector3());
  const displayValue = Math.max(1, Math.min(3, Math.ceil(Math.max(0, countdown))));
  const { scene } = useGLTF(COUNTDOWN_MODELS[displayValue]);
  const countdownScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    initializedRef.current = false;
    scaleValueRef.current = 0;
    rotationOffsetRef.current = 0;
    if (groupRef.current) {
      groupRef.current.scale.setScalar(0);
    }
  }, [active]);

  useFrame(({ camera }, dt) => {
    const car = carRef?.current;
    if (!car || !groupRef.current) return;
    lerpTarget.current.copy(car.position).add(offset);
    if (!initializedRef.current) {
      smoothPos.current.copy(lerpTarget.current);
      initializedRef.current = true;
    } else {
      smoothPos.current.lerp(lerpTarget.current, Math.min(1, dt * 8));
    }
    groupRef.current.position.copy(smoothPos.current);
    const shouldShow = active && countdown > 0;
    const targetScale = shouldShow ? COUNTDOWN_MODEL_SCALE : 0;
    scaleValueRef.current = THREE.MathUtils.lerp(scaleValueRef.current, targetScale, Math.min(1, dt * 9));
    groupRef.current.scale.setScalar(scaleValueRef.current);
    rotationOffsetRef.current = (rotationOffsetRef.current + dt * 0.9) % (Math.PI * 2);
    if (camera) {
      const group = groupRef.current;
      const target = lookTargetRef.current;
      target.copy(camera.position);
      target.y = group.position.y;
      group.lookAt(target);
      group.rotateY(rotationOffsetRef.current);
    }
    groupRef.current.visible = scaleValueRef.current > COUNTDOWN_MODEL_SCALE * 0.08;
  });

  return (
    <group ref={groupRef}>
      <primitive object={countdownScene} />
    </group>
  );
}

function QueueSlotMarkers({ slots, rotationY = 0 }) {
  const discRadius = 1.2;
  const glyphSize = 1.1;

  return (
    <group>
      {slots.map(({ id, position }) => (
        <group key={id} position={position}>
          <group rotation={[0, rotationY, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
              <circleGeometry args={[discRadius, 28]} />
              <meshStandardMaterial color="#0f172a" opacity={0.68} transparent />
            </mesh>
            <Text
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.02, 0]}
              fontSize={glyphSize}
              color="#e2e8f0"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.18}
              outlineColor="#020617"
            >
              {id}
            </Text>
          </group>
        </group>
      ))}
    </group>
  );
}

function FreeSlotMarkers({ slots }) {
  const discRadius = 1;
  const glyphSize = 0.9;

  return (
    <group>
      {slots.map(({ id, position }) => (
        <group key={`free-${id}`} position={position}>
          <group rotation={[0, Math.PI / 2, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
              <ringGeometry args={[discRadius * 0.55, discRadius, 28]} />
              <meshStandardMaterial color="#f97316" opacity={0.6} transparent />
            </mesh>
            <Text
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.02, 0]}
              fontSize={glyphSize}
              color="#ffedd5"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.12}
              outlineColor="#7c2d12"
            >
              F{id}
            </Text>
          </group>
        </group>
      ))}
    </group>
  );
}

function QueueCar({
  id,
  slotId,
  spawnTime,
  fromPosition,
  travelDuration = QUEUE_CAR_ANIMATION_DURATION,
  onToggleSelect,
  fastForward,
  targetOverride,
  phase = QUEUE_CAR_PHASE_SLOT,
  orientationOverride = null,
  headingLock = null,
  modelUrl = DEFAULT_QUEUE_CAR_MODEL,
  colorOverride = null,
  isSelected = false,
  selectionEnabled = true,
  slotLookup = QUEUE_SLOT_LOOKUP,
  licensePlate = null,
  licenseStats = {},
  showStatsOverlay = false,
  tooltipOffset = STACK_CAR_TOOLTIP_OFFSET,
  tooltipScale = STACK_CAR_TOOLTIP_SCALE,
  tooltipBackground = STACK_CAR_TOOLTIP_BACKGROUND,
}) {
  const groupRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const hoverTimeoutRef = useRef(null);
  const forwardVector = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const tempPosition = useMemo(() => new THREE.Vector3(), []);
  const tempTangent = useMemo(() => new THREE.Vector3(), []);
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const tempBlendQuaternion = useMemo(() => new THREE.Quaternion(), []);
  const extraTimeRef = useRef(0);
  const prevSpawnTimeRef = useRef(spawnTime);
  const prevPhaseRef = useRef(phase);
  const startPosition = useMemo(() => {
    if (Array.isArray(fromPosition)) {
      return new THREE.Vector3(fromPosition[0], fromPosition[1], fromPosition[2]);
    }
    return new THREE.Vector3(...QUEUE_CAR_SPAWN_POSITION);
  }, [fromPosition]);
  const targetPosition = useMemo(() => {
    const override = Array.isArray(targetOverride) ? targetOverride : null;
    const raw = override || (slotLookup ? slotLookup[slotId] : undefined);
    return raw ? new THREE.Vector3(raw[0], raw[1], raw[2]) : null;
  }, [slotId, targetOverride, slotLookup]);
  const pathCurve = useMemo(() => {
    if (!targetPosition || !startPosition) {
      return null;
    }
    const pathPoints = buildQueueCarPath(startPosition, targetPosition);
    return new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.3);
  }, [startPosition, targetPosition]);
  const animationDoneRef = useRef(false);
  const durationMs = useMemo(() => Math.max(600, Number.isFinite(travelDuration) ? travelDuration : QUEUE_CAR_ANIMATION_DURATION), [travelDuration]);
  const orientationQuaternion = useMemo(() => {
    if (phase !== QUEUE_CAR_PHASE_HOLD) {
      return null;
    }
    if (typeof orientationOverride === 'number') {
      const q = new THREE.Quaternion();
      q.setFromEuler(new THREE.Euler(0, orientationOverride, 0));
      return q;
    }
    if (Array.isArray(orientationOverride) && orientationOverride.length === 4) {
      const [x, y, z, w] = orientationOverride;
      const quat = new THREE.Quaternion(x, y, z, w);
      quat.normalize();
      return quat;
    }
    return null;
  }, [orientationOverride, phase]);
  const headingLockQuaternion = useMemo(() => {
    if (typeof headingLock === 'number') {
      const q = new THREE.Quaternion();
      q.setFromEuler(new THREE.Euler(0, headingLock, 0));
      return q;
    }
    if (Array.isArray(headingLock) && headingLock.length === 4) {
      const [x, y, z, w] = headingLock;
      const quat = new THREE.Quaternion(x, y, z, w);
      quat.normalize();
      return quat;
    }
    return null;
  }, [headingLock]);

  useEffect(() => {
    const nowTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const spawnInPast = spawnTime <= nowTime - 16;
    const prevSpawnInPast = prevSpawnTimeRef.current <= nowTime - 16;
    if (spawnInPast && prevSpawnInPast && phase === prevPhaseRef.current) {
      prevSpawnTimeRef.current = spawnTime;
      return;
    }

    animationDoneRef.current = false;
    extraTimeRef.current = 0;
    const group = groupRef.current;
    if (group) {
      group.position.copy(startPosition);
      if (phase !== QUEUE_CAR_PHASE_EXIT) {
        group.quaternion.set(0, 0, 0, 1);
        if (pathCurve) {
          pathCurve.getTangent(0, tempTangent);
          const planarLength = Math.hypot(tempTangent.x, tempTangent.z);
          if (planarLength > 1e-3) {
            tempTangent.set(tempTangent.x / planarLength, 0, tempTangent.z / planarLength);
          } else {
            tempTangent.set(0, 0, 1);
          }
          tempQuaternion.setFromUnitVectors(forwardVector, tempTangent);
          group.quaternion.copy(tempQuaternion);
        }
        if (headingLockQuaternion && (phase === QUEUE_CAR_PHASE_SLOT || phase === QUEUE_CAR_PHASE_HOLD)) {
          group.quaternion.copy(headingLockQuaternion);
        }
      }
    }
    prevSpawnTimeRef.current = spawnTime;
    prevPhaseRef.current = phase;
  }, [spawnTime, startPosition, slotId, phase, pathCurve, tempQuaternion, forwardVector, tempTangent, headingLockQuaternion]);

  const isSelectable = (phase ?? QUEUE_CAR_PHASE_SLOT) === QUEUE_CAR_PHASE_SLOT;

  const handlePointerDown = useCallback((event) => {
    event.stopPropagation();
    if (!isSelectable || !selectionEnabled) {
      return;
    }
    if (typeof onToggleSelect === 'function') {
      onToggleSelect(id);
    }
  }, [id, onToggleSelect, isSelectable, selectionEnabled]);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current == null) {
      return;
    }
    if (typeof window !== 'undefined') {
      window.clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = null;
  }, []);

  const setHoverActive = useCallback((value) => {
    if (!showStatsOverlay) {
      return;
    }
    clearHoverTimeout();
    if (value) {
      setHovered(true);
      return;
    }
    if (typeof window === 'undefined') {
      setHovered(false);
      return;
    }
    hoverTimeoutRef.current = window.setTimeout(() => {
      hoverTimeoutRef.current = null;
      setHovered(false);
    }, 80);
  }, [clearHoverTimeout, showStatsOverlay]);

  const handlePointerOver = useCallback((event) => {
    if (!showStatsOverlay) return;
    event.stopPropagation();
    setHoverActive(true);
  }, [showStatsOverlay, setHoverActive]);

  const handlePointerOut = useCallback((event) => {
    if (!showStatsOverlay) return;
    event.stopPropagation();
    setHoverActive(false);
  }, [showStatsOverlay, setHoverActive]);

  const handlePointerMove = useCallback((event) => {
    if (!showStatsOverlay) return;
    event.stopPropagation();
    setHoverActive(true);
  }, [showStatsOverlay, setHoverActive]);

  useEffect(() => () => {
    clearHoverTimeout();
  }, [clearHoverTimeout]);

  useFrame((_, dt) => {
    const group = groupRef.current;
    if (!group || !pathCurve || !targetPosition) return;
    if (animationDoneRef.current) return;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    if (fastForward) {
      extraTimeRef.current += dt * 1000 * Math.max(0, QUEUE_FAST_FORWARD_MULTIPLIER - 1);
    }
    const elapsed = Math.max(0, (now - spawnTime) + extraTimeRef.current);
    if (elapsed <= 0) {
      return;
    }
    const progress = Math.min(1, elapsed / durationMs);
    const easedProgress = easeOutCubic(progress);
    pathCurve.getPoint(easedProgress, tempPosition);
    group.position.copy(tempPosition);

    const tangentSample = Math.min(0.999, Math.max(0, easedProgress));
    pathCurve.getTangent(tangentSample, tempTangent);
    const planarLength = Math.hypot(tempTangent.x, tempTangent.z);
    if (planarLength > 1e-3) {
      tempTangent.set(tempTangent.x / planarLength, 0, tempTangent.z / planarLength);
    } else {
      tempTangent.set(0, 0, 1);
    }
    tempQuaternion.setFromUnitVectors(forwardVector, tempTangent);

    let finalOrientation = tempQuaternion;

    if (phase === QUEUE_CAR_PHASE_HOLD && orientationQuaternion) {
      const blendRatio = Math.min(1, Math.max(0, easedProgress));
      tempBlendQuaternion.copy(tempQuaternion).slerp(orientationQuaternion, blendRatio);
      group.quaternion.slerp(tempBlendQuaternion, 0.35);
      finalOrientation = orientationQuaternion;
    } else if (phase === QUEUE_CAR_PHASE_SLOT) {
      if (targetOverride) {
        const slotBlendStart = 0.55;
        const lockActive = headingLockQuaternion && easedProgress < slotBlendStart;
        if (lockActive) {
          group.quaternion.slerp(headingLockQuaternion, 0.35);
          finalOrientation = headingLockQuaternion;
        } else if (easedProgress >= slotBlendStart) {
          const normalized = Math.min(1, (easedProgress - slotBlendStart) / (1 - slotBlendStart));
          const blendSource = headingLockQuaternion || tempQuaternion;
          tempBlendQuaternion.copy(blendSource).slerp(SLOT_PARKING_QUATERNION, normalized);
          group.quaternion.slerp(tempBlendQuaternion, 0.35);
          finalOrientation = SLOT_PARKING_QUATERNION;
        } else {
          group.quaternion.slerp(tempQuaternion, 0.35);
          finalOrientation = tempQuaternion;
        }
      } else {
        group.quaternion.slerp(SLOT_PARKING_QUATERNION, 0.25);
        finalOrientation = SLOT_PARKING_QUATERNION;
      }
    } else if (phase === QUEUE_CAR_PHASE_EXIT) {
      const exitBlendStart = 0.12;
      if (easedProgress >= exitBlendStart) {
        const normalized = Math.min(1, (easedProgress - exitBlendStart) / (1 - exitBlendStart));
        const blendStrength = 0.1 + (normalized * 0.28);
        group.quaternion.slerp(tempQuaternion, blendStrength);
      }
      finalOrientation = tempQuaternion;
    } else {
      group.quaternion.slerp(tempQuaternion, 0.35);
      finalOrientation = tempQuaternion;
    }

    if (progress >= 1) {
      animationDoneRef.current = true;
      group.position.copy(targetPosition);
      group.quaternion.copy(finalOrientation);
    }
  });

  const modelSettings = useMemo(() => getQueueCarModelSettings(modelUrl), [modelUrl]);
  const highlightColor = isSelected ? SELECTED_QUEUE_CAR_HIGHLIGHT : null;
  const normalizedPlate = useMemo(() => (typeof licensePlate === 'string' && licensePlate.trim().length ? licensePlate.trim().toUpperCase() : null), [licensePlate]);
  const plateStats = useMemo(() => {
    if (!normalizedPlate) {
      return null;
    }
    return licenseStats[normalizedPlate] || DEFAULT_LICENSE_STATS;
  }, [normalizedPlate, licenseStats]);
  const tooltipVisible = showStatsOverlay && hovered && normalizedPlate;
  const tooltipPosition = Array.isArray(tooltipOffset) && tooltipOffset.length === 3
    ? tooltipOffset
    : STACK_CAR_TOOLTIP_OFFSET;
  const tooltipScaleValue = Number.isFinite(tooltipScale) ? tooltipScale : STACK_CAR_TOOLTIP_SCALE;
  const tooltipBackgroundConfig = tooltipBackground || STACK_CAR_TOOLTIP_BACKGROUND;
  const tooltipLines = useMemo(() => {
    if (!tooltipVisible || !normalizedPlate) {
      return null;
    }
    const arrivals = plateStats?.arrivals ?? 0;
    const departures = plateStats?.departures ?? 0;
    return `${normalizedPlate}\nArrivals: ${arrivals}\nDepartures: ${departures}`;
  }, [tooltipVisible, normalizedPlate, plateStats]);

  useCursor(showStatsOverlay && hovered);

  return (
    <group
      ref={groupRef}
      onPointerDown={handlePointerDown}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerMove={handlePointerMove}
    >
      {tooltipVisible && tooltipLines ? (
        <Billboard
          position={tooltipPosition}
          follow
          frustumCulled={false}
          renderOrder={999}
          raycast={() => null}
        >
          <group scale={[tooltipScaleValue, tooltipScaleValue, tooltipScaleValue]}>
            <RoundedBox
              args={[
                tooltipBackgroundConfig.width ?? STACK_CAR_TOOLTIP_BACKGROUND.width,
                tooltipBackgroundConfig.height ?? STACK_CAR_TOOLTIP_BACKGROUND.height,
                tooltipBackgroundConfig.depth ?? STACK_CAR_TOOLTIP_BACKGROUND.depth,
              ]}
              radius={tooltipBackgroundConfig.radius ?? STACK_CAR_TOOLTIP_BACKGROUND.radius}
              smoothness={4}
              position={[0, 0, -0.02]}
            >
              <meshStandardMaterial
                color={tooltipBackgroundConfig.color ?? STACK_CAR_TOOLTIP_BACKGROUND.color}
                emissive={tooltipBackgroundConfig.emissive ?? STACK_CAR_TOOLTIP_BACKGROUND.emissive}
                emissiveIntensity={tooltipBackgroundConfig.emissiveIntensity ?? STACK_CAR_TOOLTIP_BACKGROUND.emissiveIntensity}
                transparent
                opacity={tooltipBackgroundConfig.opacity ?? STACK_CAR_TOOLTIP_BACKGROUND.opacity}
                depthTest={false}
                depthWrite={false}
              />
            </RoundedBox>
            <Text
              position={[0, 0, 0.02]}
              fontSize={0.34}
              maxWidth={3}
              lineHeight={1.15}
              anchorX="center"
              anchorY="middle"
              textAlign="center"
              color="#f8fafc"
              outlineWidth={0.01}
              outlineColor="#0ea5e9"
              material-depthTest={false}
              material-depthWrite={false}
              material-toneMapped={false}
              frustumCulled={false}
            >
              {tooltipLines}
            </Text>
          </group>
        </Billboard>
      ) : null}
      <CarModel
        scale={modelSettings.scale}
        rotation={modelSettings.rotation}
        modelUrl={modelSettings.modelUrl || modelUrl}
        colorOverride={colorOverride}
        highlightColor={highlightColor}
      />
    </group>
  );
}

function QueueCarFleet({
  cars,
  slotLookup,
  onToggleSelect,
  selectedCarIds = [],
  fastForward,
  selectionEnabled = true,
  licenseStats = {},
  showStatsOverlay = false,
  tooltipOffset = STACK_CAR_TOOLTIP_OFFSET,
  tooltipScale = STACK_CAR_TOOLTIP_SCALE,
  tooltipBackground = STACK_CAR_TOOLTIP_BACKGROUND,
}) {
  return (
    <group>
      {cars.map((car) => (
        <QueueCar
          key={car.id}
          id={car.id}
          slotId={car.slotId}
          spawnTime={car.spawnTime}
          fromPosition={car.fromPosition}
          travelDuration={car.travelDuration}
          onToggleSelect={onToggleSelect}
          fastForward={fastForward}
          targetOverride={car.targetOverride}
          orientationOverride={car.orientationOverride}
          headingLock={car.headingLock}
          phase={car.phase}
          modelUrl={car.modelUrl}
          colorOverride={car.colorOverride}
          isSelected={selectedCarIds.includes(car.id)}
          selectionEnabled={selectionEnabled}
          slotLookup={slotLookup}
          licensePlate={car.licensePlate}
          licenseStats={licenseStats}
          showStatsOverlay={showStatsOverlay}
          tooltipOffset={tooltipOffset}
          tooltipScale={tooltipScale}
          tooltipBackground={tooltipBackground}
        />
      ))}
    </group>
  );
}

function MobileJoystick({ active }) {
  const baseRef = useRef(null);
  const pointerActiveRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const activeTouchIdRef = useRef(null);
  const [thumbPos, setThumbPos] = useState({ x: 0, y: 0 });
  const [isPressed, setIsPressed] = useState(false);
  const [isTouchPreferred, setIsTouchPreferred] = useState(false);

  const resetMovement = useCallback(() => {
    setThumbPos({ x: 0, y: 0 });
    setIsPressed(false);
    pointerActiveRef.current = false;
    activePointerIdRef.current = null;
    activeTouchIdRef.current = null;
    setJoystickVector(0, 0);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const evaluate = () => {
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      const touchCount = navigator.maxTouchPoints || 0;
      setIsTouchPreferred(coarse || touchCount > 0 || window.innerWidth < 768);
    };
    evaluate();
    window.addEventListener('resize', evaluate);
    return () => window.removeEventListener('resize', evaluate);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || active) {
      return undefined;
    }
    const frame = window.requestAnimationFrame(() => {
      resetMovement();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, resetMovement]);

  useEffect(() => {
    return () => {
      resetMovement();
    };
  }, [resetMovement]);

  const updateFromPosition = useCallback((clientX, clientY) => {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const radius = rect.width / 2 - 12;
    if (radius <= 0) {
      setThumbPos({ x: 0, y: 0 });
      setJoystickVector(0, 0);
      return;
    }
    const dist = Math.hypot(dx, dy);
    const clampedDist = dist > radius ? radius : dist;
    const angle = dist > 0 ? clampedDist / dist : 0;
    const offsetX = dx * angle;
    const offsetY = dy * angle;
    setThumbPos({ x: offsetX, y: offsetY });
    const nx = offsetX / radius;
    const ny = offsetY / radius;
    setJoystickVector(nx, ny);
  }, []);

  const handlePointerDown = useCallback((event) => {
    if (!active) return;
    event.preventDefault();
    pointerActiveRef.current = true;
    setIsPressed(true);
    activePointerIdRef.current = event.pointerId;
    const base = baseRef.current;
    if (base) {
      base.setPointerCapture?.(event.pointerId);
    }
    updateFromPosition(event.clientX, event.clientY);
  }, [active, updateFromPosition]);

  const handlePointerMove = useCallback((event) => {
    if (!pointerActiveRef.current || event.pointerId !== activePointerIdRef.current) return;
    event.preventDefault();
    updateFromPosition(event.clientX, event.clientY);
  }, [updateFromPosition]);

  const handlePointerEnd = useCallback((event) => {
    if (!pointerActiveRef.current || event.pointerId !== activePointerIdRef.current) return;
    const base = baseRef.current;
    if (base) {
      base.releasePointerCapture?.(event.pointerId);
    }
    resetMovement();
  }, [resetMovement]);

  const handleTouchStart = useCallback((event) => {
    if (!active || activePointerIdRef.current != null) return;
    const touch = event.touches && event.touches[0];
    if (!touch) return;
    event.preventDefault();
    pointerActiveRef.current = true;
    activeTouchIdRef.current = touch.identifier;
    setIsPressed(true);
    updateFromPosition(touch.clientX, touch.clientY);
  }, [active, updateFromPosition]);

  const handleTouchMove = useCallback((event) => {
    if (!pointerActiveRef.current || activePointerIdRef.current != null) return;
    const identifier = activeTouchIdRef.current;
    if (identifier == null) return;
    let touch = null;
    if (event.touches) {
      touch = Array.from(event.touches).find((t) => t.identifier === identifier) || event.touches[0] || null;
    }
    if (!touch) return;
    event.preventDefault();
    updateFromPosition(touch.clientX, touch.clientY);
  }, [updateFromPosition]);

  const handleTouchEnd = useCallback((event) => {
    const identifier = activeTouchIdRef.current;
    if (identifier == null) return;
    if (event.changedTouches) {
      const ended = Array.from(event.changedTouches).some((t) => t.identifier === identifier);
      if (!ended) return;
    }
    resetMovement();
  }, [resetMovement]);

  if (!isTouchPreferred || !active) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed left-4 bottom-4 z-30 sm:left-6 sm:bottom-6">
      <div
        ref={baseRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`pointer-events-auto relative flex h-28 w-28 items-center justify-center rounded-full ${isPressed ? 'bg-black/60' : 'bg-black/40'} ring-2 ring-white/25 backdrop-blur-md transition`}
        style={{ touchAction: 'none' }}
      >
        <div className="absolute inset-2 rounded-full border border-white/20" />
        <div className="absolute inset-6 rounded-full border border-white/15" />
        <div
          className="pointer-events-none h-14 w-14 rounded-full bg-sky-400/70 shadow-[0_0_16px_rgba(56,189,248,0.45)] ring-2 ring-white/40 transition-transform"
          style={{ transform: `translate3d(${thumbPos.x}px, ${thumbPos.y}px, 0)` }}
        />
      </div>
    </div>
  );
}

function StructureStateViewer({
  slotState,
  freeSlotState,
  selectedIds,
  title = 'Structure Snapshot',
  showFreeSlots = true,
  licenseStats = {},
}) {
  const selectedSet = useMemo(() => new Set(Array.isArray(selectedIds) ? selectedIds : []), [selectedIds]);

  const renderSection = (title, entries, prefix) => {
    const list = Array.isArray(entries) ? entries : [];
    return (
      <div className="mt-3 first:mt-0">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/65">{title}</div>
        <div className="mt-2 flex items-stretch gap-2">
          <span className="pt-2 text-lg font-semibold leading-none text-white/60">[</span>
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {list.map((entry) => {
          const car = entry?.car ?? null;
          const id = prefix === 'slot' ? entry.slotId : entry.markerId;
          const isSelected = Boolean(car && selectedSet.has(car.id));
          const phase = car?.phase ?? QUEUE_CAR_PHASE_SLOT;
          const phaseLabel = car
            ? phase === QUEUE_CAR_PHASE_HOLD
              ? 'Hold'
              : phase === QUEUE_CAR_PHASE_EXIT
                ? 'Exit'
                : 'Ready'
            : 'Empty';
          const cardClass = [
            'group flex flex-col gap-1 rounded-xl border px-2 py-2 text-xs leading-tight transition-colors',
            car ? 'bg-white/5 border-white/15' : 'bg-slate-900/30 border-white/10',
            isSelected ? 'ring-2 ring-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)]' : '',
          ].join(' ');
          const { label, strip } = formatCarLabel(car);
          const rawPlate = typeof car?.licensePlate === 'string' && car.licensePlate.length ? car.licensePlate : null;
          const stats = rawPlate ? licenseStats[rawPlate] : null;
          const arrivalCount = stats?.arrivals ?? 0;
          const departureCount = stats?.departures ?? 0;
          const hoverSummary = rawPlate
            ? `Plate ${rawPlate}: ${arrivalCount} arrival${arrivalCount === 1 ? '' : 's'} | ${departureCount} departure${departureCount === 1 ? '' : 's'}`
            : 'No vehicle assigned';
          return (
            <div key={`${prefix}-${id}`} className={cardClass} title={hoverSummary}>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/70">
                <span>{prefix === 'slot' ? `Slot ${id}` : `Free ${id}`}</span>
                {car?.colorOverride ? (
                  <span
                    className="h-2 w-2 rounded-full border border-white/20"
                    style={{ backgroundColor: car.colorOverride }}
                  />
                ) : null}
              </div>
              {strip ? (
                <div className="h-2 rounded-full border border-white/15" style={{ backgroundColor: strip }} />
              ) : (
                <div className="text-sm font-semibold text-white">{label}</div>
              )}
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/75">
                {rawPlate ?? 'No plate'}
              </div>
              {rawPlate ? (
                <div className="min-h-[1rem] text-[10px] text-white/60 leading-snug whitespace-normal opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  Arrivals: {arrivalCount} | Departures: {departureCount}
                </div>
              ) : (
                <div className="min-h-[1rem] text-[10px] text-white/35 leading-snug">Waiting for vehicle</div>
              )}
              <div className="text-[10px] uppercase tracking-[0.14em] text-white/45">{phaseLabel}</div>
            </div>
          );
        })}
          </div>
          <span className="pt-2 text-lg font-semibold leading-none text-white/60">]</span>
        </div>
      </div>
    );
  };

  return (
    <div className="pointer-events-auto absolute left-4 top-[8.5rem] z-30 w-[min(95vw,28rem)] text-white sm:left-6 sm:top-[9.6rem]">
      <div className="max-h-[70vh] overflow-hidden rounded-2xl bg-slate-950/75 shadow-lg ring-1 ring-white/15 backdrop-blur">
        <div className="max-h-[70vh] overflow-y-auto p-4">
        <div className="text-xs uppercase tracking-[0.22em] text-white/70">{title}</div>
        {renderSection('Number Slots', slotState, 'slot')}
        {showFreeSlots ? renderSection('Free Slots', freeSlotState, 'free') : null}
        </div>
      </div>
    </div>
  );
}

export default function ParkingScene({
  showStackState = false,
  showQueueState = false,
  onStackMinigameChange,
  onQueueMinigameChange,
}) {
  useEffect(() => {
    useGLTF.preload('/car-show/models/car/scene.gltf');
    useGLTF.preload('/models/modern_parking_area.glb');
    useGLTF.preload('/models/street_road.glb');
    useGLTF.preload('/models/parking_toll.glb');
    useGLTF.preload('/models/road_barrier.glb');
    useGLTF.preload(SECURITY_GUARD_MODEL_PATH);
    Object.values(COUNTDOWN_MODELS).forEach((path) => useGLTF.preload(path));
    QUEUE_CAR_MODEL_PATHS.forEach((path) => useGLTF.preload(path));
  }, []);
  const [speed, setSpeed] = useState(0);
  const carRef = useRef(null);

  const {
    isActive: carOnQueueMarker,
    countdown: queueCountdown,
    handlePresenceChange: rawHandleQueueMarkerPresence,
  } = useMarkerController({
    startValue: STACK_COUNTDOWN_START,
    markerSfx: MARKER_SFX_URL,
    countdownSfx: COUNTDOWN_SFX_URL,
    markerVolume: 0.7,
    countdownVolume: 0.8,
  });

  const {
    isActive: carOnStackMarker,
    countdown: stackCountdown,
    handlePresenceChange: rawHandleStackMarkerPresence,
  } = useMarkerController({
    startValue: STACK_COUNTDOWN_START,
    markerSfx: MARKER_SFX_URL,
    countdownSfx: COUNTDOWN_SFX_URL,
    markerVolume: 0.7,
    countdownVolume: 0.8,
  });

  const {
    isActive: carOnInteractMarker,
    countdown: interactCountdown,
    handlePresenceChange: rawHandleInteractPresence,
  } = useMarkerController({
    startValue: STACK_COUNTDOWN_START,
    markerSfx: MARKER_SFX_URL,
    countdownSfx: COUNTDOWN_SFX_URL,
    markerVolume: 0.7,
    countdownVolume: 0.8,
  });
  const [interactPhase, setInteractPhase] = useState('idle');
  const [licenseDropped, setLicenseDropped] = useState(false);
  const [isDragOverDropzone, setIsDragOverDropzone] = useState(false);
  const [licenseImageUrl, setLicenseImageUrl] = useState(DEFAULT_LICENSE_IMAGE);
  const currentLicenseImageSrc = licenseImageUrl || DEFAULT_LICENSE_IMAGE;
  const [barrierShouldOpen, setBarrierShouldOpen] = useState(false);
  const [activeMinigame, setActiveMinigame] = useState(null);
  const [stackMinigameArmed, setStackMinigameArmed] = useState(true);
  const [queueMinigameArmed, setQueueMinigameArmed] = useState(true);
  const [queueCars, setQueueCars] = useState([]);
  const [queueFastForward, setQueueFastForward] = useState(false);
  const [selectedQueueCarIds, setSelectedQueueCarIds] = useState([]);
  const [minigameLoading, setMinigameLoading] = useState(false);
  const [minigameLoadingStep, setMinigameLoadingStep] = useState(0);
  const [minigameLoadingMode, setMinigameLoadingMode] = useState(null);
  const [queueRemovalActive, setQueueRemovalActive] = useState(false);
  const [licenseStats, setLicenseStats] = useState({});
  const [licenseModalOpen, setLicenseModalOpen] = useState(false);
  const [licenseModalMode, setLicenseModalMode] = useState(null);
  const [licenseInputValue, setLicenseInputValue] = useState('');
  const [licenseModalError, setLicenseModalError] = useState('');
  const queuedRemovalIdsRef = useRef([]);
  const processQueuedRemovalsRef = useRef(() => {});
  const minigameStateRef = useRef(null);
  const queueRemovalInProgressRef = useRef(false);
  const queueRemovalTimeoutRef = useRef(null);
  const queueExitCleanupTimeoutRef = useRef(null);
  const queueFastForwardRef = useRef(queueFastForward);
  const currentRemovalPlanRef = useRef(null);
  const queueCarsRef = useRef(queueCars);
  const minigameLoadingTimeoutRef = useRef(null);
  const guardPromptSfxPlayedRef = useRef(false);
  const guardApprovalSfxPlayedRef = useRef(false);
  const dropZoneRef = useRef(null);
  const licenseInputRef = useRef(null);
  const touchPointerIdRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const [touchDragState, setTouchDragState] = useState(null);
  const activeSlotDataset = useMemo(
    () => getSlotDataset(activeMinigame === 'stack' ? 'stack' : 'queue'),
    [activeMinigame],
  );
  const queueIsFull = queueCars.length >= activeSlotDataset.positions.length;
  const queueHasRemovable = useMemo(
    () => queueCars.some((car) => (car?.phase ?? QUEUE_CAR_PHASE_SLOT) === QUEUE_CAR_PHASE_SLOT),
    [queueCars],
  );
  const joystickActive = useMemo(
    () => activeMinigame !== 'stack' && !['prompt', 'handover', 'checking', 'approved'].includes(interactPhase),
    [activeMinigame, interactPhase],
  );
  const minigameLoadingMessage = QUEUE_LOADING_MESSAGES.length
    ? QUEUE_LOADING_MESSAGES[minigameLoadingStep % QUEUE_LOADING_MESSAGES.length]
    : 'Preparing the queue...';
  const minigameLoadingProgress = QUEUE_LOADING_MESSAGES.length
    ? Math.min(100, Math.round(((Math.min(minigameLoadingStep, QUEUE_LOADING_MESSAGES.length - 1) + 1) / QUEUE_LOADING_MESSAGES.length) * 100))
    : 100;

  const securityGuardCameraTarget = useMemo(() => ({
    position: new THREE.Vector3(...SECURITY_GUARD_CAMERA_POSITION),
    lookAt: new THREE.Vector3(...SECURITY_GUARD_CAMERA_LOOK_AT),
  }), []);

  const queueSlotState = useMemo(() => {
    const { positions, idToIndex } = activeSlotDataset;
    const slots = positions.map((slot) => ({ slotId: slot.id, car: null }));
    queueCars.forEach((car) => {
      const phase = car?.phase ?? QUEUE_CAR_PHASE_SLOT;
      if (phase !== QUEUE_CAR_PHASE_SLOT) return;
      const slotId = Number(car?.slotId);
      if (!Number.isFinite(slotId)) return;
      if (!idToIndex.has(slotId)) return;
      const index = idToIndex.get(slotId);
      if (index == null || slots[index].car) return;
      slots[index] = { slotId, car };
    });
    return slots;
  }, [queueCars, activeSlotDataset]);

  const queueHoldState = useMemo(() => {
    const markers = FREE_MARKER_POSITIONS.map((marker) => ({ markerId: marker.id, car: null }));
    queueCars.forEach((car) => {
      const phase = car?.phase ?? QUEUE_CAR_PHASE_SLOT;
      if (phase !== QUEUE_CAR_PHASE_HOLD) return;
      const markerId = getMarkerIdFromPosition(car?.targetOverride);
      if (markerId == null) return;
      const resolvedMarkerId = Number(markerId);
      if (!Number.isFinite(resolvedMarkerId)) return;
      const index = FREE_MARKER_ID_TO_INDEX.get(resolvedMarkerId);
      if (index == null || markers[index].car) return;
      markers[index] = { markerId: resolvedMarkerId, car };
    });
    return markers;
  }, [queueCars]);

  const licenseModalHeading = licenseModalMode === 'queue' ? 'New queue arrival' : 'New stack arrival';
  const licenseModalBody = licenseModalMode === 'queue'
    ? 'Give this queue car a plate so we can track its visits.'
    : 'Give this stack car a plate so we can track its visits.';
  const licenseModalInputId = licenseModalMode === 'queue' ? 'queue-license-entry' : 'stack-license-entry';

  const recordLicenseEvent = useCallback((plate, eventType) => {
    const normalized = sanitizeLicensePlateValue(plate);
    if (!normalized) {
      return;
    }
    setLicenseStats((prev) => {
      const existing = prev[normalized] || { arrivals: 0, departures: 0 };
      const nextRecord = eventType === 'arrival'
        ? { arrivals: existing.arrivals + 1, departures: existing.departures }
        : { arrivals: existing.arrivals, departures: existing.departures + 1 };
      if (existing.arrivals === nextRecord.arrivals && existing.departures === nextRecord.departures) {
        return prev;
      }
      return { ...prev, [normalized]: nextRecord };
    });
  }, [setLicenseStats]);

  const handleLicenseModalClose = useCallback(() => {
    setLicenseModalOpen(false);
    setLicenseInputValue('');
    setLicenseModalError('');
    setLicenseModalMode(null);
  }, []);

  const handleLicenseInputChange = useCallback((event) => {
    const nextValue = sanitizeLicensePlateValue(event?.target?.value ?? '');
    setLicenseInputValue(nextValue);
    if (licenseModalError) {
      setLicenseModalError('');
    }
  }, [licenseModalError]);

  const interactCameraActive = carOnInteractMarker && INTERACT_CAMERA_PHASES.has(interactPhase);

  const handleInteractMarkerPresence = useCallback((isInside) => {
    rawHandleInteractPresence(isInside);
    if (!isInside) {
      setInteractPhase('idle');
      setLicenseDropped(false);
      setIsDragOverDropzone(false);
    }
  }, [rawHandleInteractPresence]);

  useEffect(() => {
    if (interactPhase === 'prompt' && interactCountdown <= 0 && carOnInteractMarker) {
      if (!guardPromptSfxPlayedRef.current) {
        playSfx(SECURITY_GUARD_TALKING_SFX, 0.75);
        guardPromptSfxPlayedRef.current = true;
      }
    } else if (interactPhase !== 'prompt') {
      guardPromptSfxPlayedRef.current = false;
    }
  }, [carOnInteractMarker, interactCountdown, interactPhase]);

  useEffect(() => {
    if (interactPhase === 'approved') {
      if (!guardApprovalSfxPlayedRef.current) {
        playSfx(SECURITY_GUARD_TALKING_SFX, 0.75);
        guardApprovalSfxPlayedRef.current = true;
      }
    } else if (guardApprovalSfxPlayedRef.current) {
      guardApprovalSfxPlayedRef.current = false;
    }
  }, [interactPhase]);

  const handleQueueMarkerPresence = useCallback((isInside) => {
    rawHandleQueueMarkerPresence(isInside);
    if (!isInside) {
      setQueueMinigameArmed(true);
    }
  }, [rawHandleQueueMarkerPresence]);

  const handleStackMarkerPresence = useCallback((isInside) => {
    rawHandleStackMarkerPresence(isInside);
    if (!isInside) {
      setStackMinigameArmed(true);
    }
  }, [rawHandleStackMarkerPresence]);

  useEffect(() => {
    queueCarsRef.current = queueCars;
  }, [queueCars]);

  useEffect(() => {
    if (!queueRemovalInProgressRef.current && queuedRemovalIdsRef.current.length) {
      processQueuedRemovalsRef.current();
    }
  }, [queueCars]);

  useEffect(() => {
    if (!minigameLoading) {
      setMinigameLoadingStep(0);
      return undefined;
    }
    setMinigameLoadingStep(0);
    if (QUEUE_LOADING_MESSAGES.length < 2) {
      return undefined;
    }
    let currentStep = 0;
    const stepWindow = Math.max(1, Math.min(QUEUE_LOADING_MESSAGES.length, 3));
    const intervalDuration = Math.max(400, Math.floor(QUEUE_LOADING_DELAY_MS / stepWindow));
    const intervalId = window.setInterval(() => {
      currentStep = (currentStep + 1) % QUEUE_LOADING_MESSAGES.length;
      setMinigameLoadingStep(currentStep);
    }, intervalDuration);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [minigameLoading]);

  const handleToggleQueueCarSelection = useCallback((carId) => {
    const target = queueCars.find((entry) => entry.id === carId);
    if (!target) {
      return;
    }
    const phaseValue = target.phase ?? QUEUE_CAR_PHASE_SLOT;
    if (phaseValue !== QUEUE_CAR_PHASE_SLOT) {
      return;
    }
    setSelectedQueueCarIds((prev) => {
      if (prev.includes(carId)) {
        queuedRemovalIdsRef.current = queuedRemovalIdsRef.current.filter((id) => id !== carId);
        return prev.filter((id) => id !== carId);
      }
      return [...prev, carId];
    });
  }, [queueCars]);

  const startQueueFrontRemoval = useCallback((frontCarId) => {
    if (!frontCarId || queueRemovalInProgressRef.current) {
      return;
    }
    const snapshot = queueCarsRef.current
      .filter((car) => (car.phase ?? QUEUE_CAR_PHASE_SLOT) === QUEUE_CAR_PHASE_SLOT)
      .sort((a, b) => a.slotId - b.slotId);
    const frontIndex = snapshot.findIndex((car) => car.id === frontCarId);
    if (frontIndex === -1) {
      return;
    }
    const frontCar = snapshot[frontIndex];
    const trailing = snapshot.slice(frontIndex + 1);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const exitDuration = getQueueTravelDuration(frontCar.slotId) + 9600;

    let targetSlotCursor = frontCar.slotId;
    let cumulativeDelay = Math.max(420, Math.round(exitDuration * 0.18));
    let lastShiftCompletion = exitDuration;

    const reassignments = new Map();
    trailing.forEach((car) => {
      targetSlotCursor = Math.max(1, targetSlotCursor);
      const targetSlotId = targetSlotCursor;
      const relocationDuration = getQueueRelocationDuration(car.slotId);
      reassignments.set(car.id, {
        targetSlotId,
        startSlotId: car.slotId,
        delay: cumulativeDelay,
        duration: relocationDuration,
        headingLock: car.headingLock,
      });
      lastShiftCompletion = Math.max(lastShiftCompletion, cumulativeDelay + relocationDuration);
      cumulativeDelay += relocationDuration + QUEUE_HOLD_GAP_MS;
      targetSlotCursor += 1;
    });

    const cleanupDelay = Math.max(exitDuration, lastShiftCompletion) + QUEUE_CLEANUP_BUFFER_MS;

    queueRemovalInProgressRef.current = true;
    setQueueRemovalActive(true);
    currentRemovalPlanRef.current = null;
    queuedRemovalIdsRef.current = queuedRemovalIdsRef.current.filter((id) => id !== frontCar.id);

    if (typeof window !== 'undefined') {
      if (queueRemovalTimeoutRef.current) {
        window.clearTimeout(queueRemovalTimeoutRef.current);
        queueRemovalTimeoutRef.current = null;
      }
      if (queueExitCleanupTimeoutRef.current) {
        window.clearTimeout(queueExitCleanupTimeoutRef.current);
        queueExitCleanupTimeoutRef.current = null;
      }
    }

    setQueueCars((prev) => prev.map((car) => {
      if (car.id === frontCar.id) {
        const startPos = clonePositionArray(QUEUE_SLOT_LOOKUP[car.slotId] || car.fromPosition);
        const exitingCar = {
          ...car,
          phase: QUEUE_CAR_PHASE_EXIT,
          fromPosition: startPos,
          targetOverride: clonePositionArray(QUEUE_EXIT_POSITION),
          orientationOverride: null,
          headingLock: null,
          spawnTime: now,
          travelDuration: exitDuration,
        };
        logQueueCarAssignment('queue-dequeue-exit', exitingCar, car.slotId);
        return exitingCar;
      }
      const reassignment = reassignments.get(car.id);
      if (reassignment) {
        const startPos = clonePositionArray(QUEUE_SLOT_LOOKUP[car.slotId] || car.fromPosition);
        const targetSlotId = reassignment.targetSlotId;
        const relocation = {
          ...car,
          slotId: targetSlotId,
          fromPosition: startPos,
          targetOverride: null,
          orientationOverride: null,
          headingLock: reassignment.headingLock ?? car.headingLock,
          phase: QUEUE_CAR_PHASE_SLOT,
          spawnTime: now + reassignment.delay,
          travelDuration: reassignment.duration,
        };
        logQueueCarAssignment('queue-dequeue-shift', relocation, targetSlotId);
        return relocation;
      }
      return car;
    }));

    const frontLicensePlate = typeof frontCar.licensePlate === 'string' ? frontCar.licensePlate : null;

    if (typeof window !== 'undefined') {
      queueExitCleanupTimeoutRef.current = window.setTimeout(() => {
        setQueueCars((current) => current.filter((car) => car.id !== frontCar.id));
        if (frontLicensePlate) {
          recordLicenseEvent(frontLicensePlate, 'departure');
        }
        queueExitCleanupTimeoutRef.current = null;
        queueRemovalInProgressRef.current = false;
        setQueueRemovalActive(false);
      }, cleanupDelay);
    } else {
      setQueueCars((current) => current.filter((car) => car.id !== frontCar.id));
      if (frontLicensePlate) {
        recordLicenseEvent(frontLicensePlate, 'departure');
      }
      queueRemovalInProgressRef.current = false;
      setQueueRemovalActive(false);
    }
  }, [setQueueCars, setQueueRemovalActive, recordLicenseEvent]);

  const handleQueueMoveSelected = useCallback(() => {
    if (activeMinigame !== 'stack') {
      return;
    }
    if (!selectedQueueCarIds.length) {
      return;
    }
    const selectableCars = queueCars
      .filter((car) => selectedQueueCarIds.includes(car.id) && (car.phase ?? QUEUE_CAR_PHASE_SLOT) === QUEUE_CAR_PHASE_SLOT)
      .sort((a, b) => a.slotId - b.slotId);

    if (!selectableCars.length) {
      return;
    }

    const queuedSet = new Set(queuedRemovalIdsRef.current);
    selectableCars.forEach((car) => {
      if (!queuedSet.has(car.id)) {
        queuedRemovalIdsRef.current.push(car.id);
        queuedSet.add(car.id);
      }
    });

    if (!queueRemovalInProgressRef.current) {
      processQueuedRemovalsRef.current();
    }
  }, [queueCars, selectedQueueCarIds, activeMinigame]);

  const spawnQueueCar = useCallback((options = {}) => {
    const rawPlate = typeof options.licensePlate === 'string' ? options.licensePlate : '';
    const normalizedPlate = sanitizeLicensePlateValue(rawPlate);
    const licensePlate = normalizedPlate.length ? normalizedPlate : null;
    const datasetKey = activeMinigame === 'stack' ? 'stack' : 'queue';
    const { positions, lookup } = getSlotDataset(datasetKey);
    const current = queueCarsRef.current;
    if (current.length >= positions.length) {
      return null;
    }
    const occupied = new Set(current.map((entry) => entry.slotId));
    const nextSlot = positions.find((slot) => !occupied.has(slot.id));
    if (!nextSlot) {
      return null;
    }
    const globalCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
    const generatedId = globalCrypto && typeof globalCrypto.randomUUID === 'function'
      ? globalCrypto.randomUUID()
      : `queue-car-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const spawnTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const modelUrl = pickRandomQueueCarModel();
    const colorOverride = pickQueueCarColor(modelUrl);
    const newCar = {
      slotId: nextSlot.id,
      id: generatedId,
      spawnTime: spawnTimestamp,
      fromPosition: QUEUE_CAR_SPAWN_POSITION.slice(),
      travelDuration: getQueueTravelDuration(nextSlot.id),
      phase: QUEUE_CAR_PHASE_SLOT,
      targetOverride: null,
      modelUrl,
      colorOverride,
      headingLock: null,
      licensePlate,
    };
    const nextArray = ensureUniqueSlotAssignments([...current, newCar], 'spawn', positions, lookup);
    const inserted = nextArray.find((entry) => entry.id === newCar.id) || newCar;
    if (Number.isFinite(inserted.slotId)) {
      logQueueCarAssignment('spawn', inserted, inserted.slotId);
    }
    setQueueCars(nextArray);
    queueCarsRef.current = nextArray;
    if (licensePlate) {
      recordLicenseEvent(licensePlate, 'arrival');
    }
    return inserted;
  }, [activeMinigame, recordLicenseEvent]);

  const handleAddQueueCar = useCallback(() => {
    if (activeMinigame !== 'stack' && activeMinigame !== 'queue') {
      return;
    }
    if (queueIsFull) {
      return;
    }
    setLicenseModalError('');
    setLicenseInputValue('');
    setLicenseModalMode(activeMinigame);
    setLicenseModalOpen(true);
  }, [activeMinigame, queueIsFull]);

  const handleLicenseModalSubmit = useCallback((event) => {
    event.preventDefault();
    if (licenseModalMode !== 'stack' && licenseModalMode !== 'queue') {
      handleLicenseModalClose();
      return;
    }
    const normalized = sanitizeLicensePlateValue(licenseInputValue);
    if (!normalized) {
      setLicenseModalError('Enter a license plate using letters, numbers, or hyphens.');
      return;
    }
    const activeCars = queueCarsRef.current;
    const inUse = activeCars.some((car) => (car.phase ?? QUEUE_CAR_PHASE_SLOT) !== QUEUE_CAR_PHASE_EXIT && car.licensePlate === normalized);
    if (inUse) {
      setLicenseModalError('That license plate is already parked.');
      return;
    }
    const result = spawnQueueCar({ licensePlate: normalized });
    if (!result) {
      const noSlotMessage = licenseModalMode === 'queue'
        ? 'No available queue slots right now.'
        : 'No available stack slots right now.';
      setLicenseModalError(noSlotMessage);
      return;
    }
    handleLicenseModalClose();
  }, [licenseInputValue, licenseModalMode, spawnQueueCar, handleLicenseModalClose]);

  const handleQueueDequeueFront = useCallback(() => {
    const available = queueCars
      .filter((car) => (car.phase ?? QUEUE_CAR_PHASE_SLOT) === QUEUE_CAR_PHASE_SLOT)
      .sort((a, b) => a.slotId - b.slotId);
    const front = available[0];
    if (!front) {
      return;
    }
    if (activeMinigame === 'queue') {
      startQueueFrontRemoval(front.id);
      return;
    }
    if (activeMinigame !== 'stack') {
      return;
    }
    const alreadyQueued = queuedRemovalIdsRef.current.includes(front.id);
    if (!alreadyQueued) {
      queuedRemovalIdsRef.current.push(front.id);
    }
    if (!queueRemovalInProgressRef.current) {
      processQueuedRemovalsRef.current();
    }
  }, [activeMinigame, queueCars, startQueueFrontRemoval]);

  const scheduleCleanupTimer = useCallback((plan) => {
    if (!plan || currentRemovalPlanRef.current !== plan) return;
    if (queueExitCleanupTimeoutRef.current) {
      window.clearTimeout(queueExitCleanupTimeoutRef.current);
      queueExitCleanupTimeoutRef.current = null;
    }
    const nowTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cleanupTarget = plan.cleanupTimestamp ?? (plan.startTime + plan.scheduleCleanupOffset);
    const cleanupDelay = Math.max(0, cleanupTarget - nowTime);
    queueExitCleanupTimeoutRef.current = window.setTimeout(() => {
      if (currentRemovalPlanRef.current !== plan) {
        return;
      }
      queueExitCleanupTimeoutRef.current = null;
      setQueueCars((current) => current.filter((car) => car.id !== plan.carId));
      setSelectedQueueCarIds((current) => current.filter((id) => id !== plan.carId));
      queuedRemovalIdsRef.current = queuedRemovalIdsRef.current.filter((id) => id !== plan.carId);
      if (plan.licensePlate) {
        recordLicenseEvent(plan.licensePlate, 'departure');
      }
      queueRemovalInProgressRef.current = false;
      setQueueRemovalActive(false);
      currentRemovalPlanRef.current = null;
      processQueuedRemovalsRef.current();
    }, cleanupDelay);
  }, [setQueueCars, setSelectedQueueCarIds, recordLicenseEvent, setQueueRemovalActive]);

  const triggerRemovalRejoin = useCallback(() => {
    const plan = currentRemovalPlanRef.current;
    if (!plan) {
      if (queueRemovalTimeoutRef.current) {
        window.clearTimeout(queueRemovalTimeoutRef.current);
        queueRemovalTimeoutRef.current = null;
      }
      return;
    }
    if (currentRemovalPlanRef.current !== plan || plan.rejoinCompleted) {
      if (queueRemovalTimeoutRef.current) {
        window.clearTimeout(queueRemovalTimeoutRef.current);
        queueRemovalTimeoutRef.current = null;
      }
      return;
    }
    queueRemovalTimeoutRef.current = null;
    plan.rejoinCompleted = true;
    const holdMetaMap = new Map(plan.holdDetails.map((detail) => [detail.id, detail]));
    const { positions, lookup } = getSlotDataset(activeMinigame === 'stack' ? 'stack' : 'queue');
    setQueueCars((current) => {
      if (currentRemovalPlanRef.current !== plan) {
        return current;
      }
      const exitEntry = current.find((car) => car.id === plan.carId);
      const filtered = current.filter((car) => car.id !== plan.carId);
      const nowRejoin = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const resorted = filtered.slice().sort((a, b) => a.slotId - b.slotId);
      let rejoinCursor = nowRejoin;
      const effectiveScale = plan.spacingScale || plan.currentScale || 1;
      const rejoinBuffer = Math.max(
        QUEUE_REJOIN_MIN_BUFFER_MS,
        Math.round(QUEUE_REJOIN_BUFFER_SCALE_MS * effectiveScale),
      ); // Keep stagger wide enough to prevent path overlap
      const rejoinLogIds = new Set();
      const remappedCars = resorted.map((car, index) => {
        const nextSlot = positions[index];
        if (!nextSlot) {
          return car;
        }
        const holdMeta = holdMetaMap.get(car.id);
        if (holdMeta) {
          const startSource = clonePositionArray(holdMeta.freeMarkerPosition || FREE_MARKER_LOOKUP[holdMeta.originalSlotId] || QUEUE_CAR_SPAWN_POSITION);
          const travelDuration = getQueueRelocationDuration(nextSlot.id);
          const spawnTime = rejoinCursor;
          rejoinCursor += travelDuration + rejoinBuffer;
          const preservedHeading = typeof holdMeta.holdOrientation === 'number'
            ? holdMeta.holdOrientation
            : (Array.isArray(car.headingLock) ? car.headingLock.slice() : car.headingLock);
          const reassigned = {
            ...car,
            slotId: nextSlot.id,
            phase: QUEUE_CAR_PHASE_SLOT,
            targetOverride: clonePositionArray(nextSlot.position),
            fromPosition: startSource,
            spawnTime,
            travelDuration,
            orientationOverride: null,
            headingLock: preservedHeading,
          };
          rejoinLogIds.add(reassigned.id);
          return reassigned;
        }
        return {
          ...car,
          slotId: nextSlot.id,
          phase: QUEUE_CAR_PHASE_SLOT,
          targetOverride: null,
          orientationOverride: null,
          headingLock: null,
        };
      });
      const nextCars = ensureUniqueSlotAssignments(remappedCars, 'rejoin', positions, lookup);
      nextCars.forEach((entry) => {
        if (rejoinLogIds.has(entry.id) && Number.isFinite(entry.slotId)) {
          logQueueCarAssignment('rejoin', entry, entry.slotId);
        }
      });
      const exitCarEntry = exitEntry ? { ...exitEntry, slotId: null } : null;
      return exitCarEntry ? [...nextCars, exitCarEntry] : nextCars;
    });
    scheduleCleanupTimer(plan);
  }, [scheduleCleanupTimer, setQueueCars, activeMinigame]);

  const schedulePlanTimers = useCallback((plan) => {
    if (!plan || plan.rejoinCompleted || currentRemovalPlanRef.current !== plan) {
      return;
    }
    if (queueRemovalTimeoutRef.current) {
      window.clearTimeout(queueRemovalTimeoutRef.current);
      queueRemovalTimeoutRef.current = null;
    }
    const nowTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const rejoinTarget = plan.rejoinTimestamp ?? (plan.startTime + plan.scheduleRejoinOffset);
    const rejoinDelay = Math.max(0, rejoinTarget - nowTime);
    queueRemovalTimeoutRef.current = window.setTimeout(triggerRemovalRejoin, rejoinDelay);
  }, [triggerRemovalRejoin]);

  const applyRemovalPlanTimeline = useCallback((plan, scale, options = {}) => {
    if (!plan) return Array.isArray(options.sourceCars) ? options.sourceCars : undefined;
    const resolvedScale = Number.isFinite(scale) ? Math.max(0.001, scale) : 1;
    const spacingScale = Math.max(resolvedScale, QUEUE_MIN_REMOVAL_TIMELINE_SCALE);
    plan.currentScale = resolvedScale;
    plan.spacingScale = spacingScale;
    plan.scheduleExitStartOffset = plan.baseExitStartOffset * spacingScale;
    const exitClearWindow = Math.max(plan.exitClearWindowBase * spacingScale, plan.exitClearWindowMin || QUEUE_EXIT_CLEAR_MIN_MS);
    plan.scheduleRejoinOffset = (plan.baseExitStartOffset * spacingScale) + exitClearWindow;
    const scaledExitDuration = Math.max(plan.exitDuration * resolvedScale, plan.exitDuration * QUEUE_MIN_REMOVAL_TIMELINE_SCALE);
    plan.scheduleCleanupOffset = (plan.baseExitStartOffset * spacingScale) + scaledExitDuration + plan.cleanupBuffer;
    plan.holdDetails.forEach((detail) => {
      detail.scheduleStartOffset = detail.baseStartOffset * spacingScale;
    });

    const rejoinCandidate = plan.startTime + plan.scheduleRejoinOffset;
    plan.rejoinTimestamp = plan.rejoinTimestamp == null ? rejoinCandidate : Math.min(plan.rejoinTimestamp, rejoinCandidate);
    const cleanupCandidate = plan.startTime + plan.scheduleCleanupOffset;
    plan.cleanupTimestamp = plan.cleanupTimestamp == null ? cleanupCandidate : Math.min(plan.cleanupTimestamp, cleanupCandidate);

    const wasApplied = Boolean(plan.applied);
    const { positions, lookup } = getSlotDataset(activeMinigame === 'stack' ? 'stack' : 'queue');

    const transform = (input, referenceNow) => {
      const nowRef = Number.isFinite(referenceNow)
        ? referenceNow
        : (typeof performance !== 'undefined' ? performance.now() : Date.now());

      const mapped = input.map((entry) => {
        if (entry.id === plan.carId) {
          const spawnTime = plan.startTime + plan.scheduleExitStartOffset;
          if (!wasApplied) {
            return {
              ...entry,
              phase: QUEUE_CAR_PHASE_EXIT,
              targetOverride: clonePositionArray(plan.exitTargetPosition),
              fromPosition: clonePositionArray(plan.exitFromPosition),
              spawnTime,
              travelDuration: plan.exitDuration,
              orientationOverride: null,
            };
          }
          if (!plan.rejoinCompleted && entry.phase === QUEUE_CAR_PHASE_EXIT && entry.spawnTime > nowRef) {
            const desiredSpawn = Math.min(entry.spawnTime, spawnTime);
            if (desiredSpawn <= nowRef + 8) {
              return entry;
            }
            if (Math.abs(desiredSpawn - entry.spawnTime) < 0.5) {
              return entry;
            }
            return {
              ...entry,
              spawnTime: desiredSpawn,
            };
          }
          return entry;
        }

        const detail = plan.holdDetailsById.get(entry.id);
        if (detail) {
          const spawnTime = plan.startTime + detail.scheduleStartOffset;
          if (!wasApplied) {
            return {
              ...entry,
              phase: QUEUE_CAR_PHASE_HOLD,
              targetOverride: clonePositionArray(detail.markerPosition),
              fromPosition: clonePositionArray(detail.startPosition),
              spawnTime,
              travelDuration: detail.travelDuration,
              orientationOverride: detail.holdOrientation,
              headingLock: Array.isArray(detail.initialHeading)
                ? detail.initialHeading.slice()
                : detail.initialHeading,
            };
          }
          if (!plan.rejoinCompleted && entry.phase === QUEUE_CAR_PHASE_HOLD && entry.spawnTime > nowRef) {
            const desiredSpawn = Math.min(entry.spawnTime, spawnTime);
            if (desiredSpawn <= nowRef + 8) {
              return entry;
            }
            if (Math.abs(desiredSpawn - entry.spawnTime) < 0.5) {
              return entry;
            }
            return {
              ...entry,
              spawnTime: desiredSpawn,
            };
          }
          return entry;
        }

        if (!wasApplied && ((entry.phase ?? QUEUE_CAR_PHASE_SLOT) !== QUEUE_CAR_PHASE_SLOT || entry.targetOverride || entry.orientationOverride)) {
          return {
            ...entry,
            phase: QUEUE_CAR_PHASE_SLOT,
            targetOverride: null,
            orientationOverride: null,
            headingLock: null,
          };
        }

        return entry;
      });

      return ensureUniqueSlotAssignments(mapped, wasApplied ? 'reschedule' : 'apply', positions, lookup);
    };

    if (Array.isArray(options.sourceCars)) {
      const result = transform(options.sourceCars, options.referenceNow);
      plan.applied = true;
      if (!plan.rejoinCompleted) {
        schedulePlanTimers(plan);
      }
      return result;
    }

    setQueueCars((prev) => transform(prev));
    plan.applied = true;
    if (!plan.rejoinCompleted) {
      schedulePlanTimers(plan);
    }
    return undefined;
  }, [schedulePlanTimers, setQueueCars, activeMinigame]);

  const handleRemoveQueueCar = useCallback((carId) => {
    if ((activeMinigame !== 'stack' && activeMinigame !== 'queue') || queueRemovalInProgressRef.current) {
      return;
    }

    const { lookup } = getSlotDataset(activeMinigame === 'stack' ? 'stack' : 'queue');
    setQueueCars((prev) => {
      if (!prev.length) {
        return prev;
      }

      const sorted = prev.slice().sort((a, b) => a.slotId - b.slotId);
      const exitIndex = sorted.findIndex((car) => car.id === carId);
      if (exitIndex === -1) {
        return prev;
      }
      if (sorted.some((car) => (car.phase ?? QUEUE_CAR_PHASE_SLOT) !== QUEUE_CAR_PHASE_SLOT)) {
        return prev;
      }

      const exitCar = sorted[exitIndex];
      const trailingCars = sorted.filter((car) => car.slotId > exitCar.slotId);
      const holdOrder = trailingCars.slice().reverse();
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

      const plan = {
        carId,
        startTime: now,
        exitDuration: getQueueTravelDuration(exitCar.slotId) + 9600,
        exitTargetPosition: clonePositionArray(QUEUE_EXIT_POSITION),
        exitFromPosition: clonePositionArray(lookup[exitCar.slotId] || QUEUE_CAR_SPAWN_POSITION),
        holdDetails: [],
        holdDetailsById: new Map(),
        baseExitStartOffset: 0,
        baseRejoinOffset: 0,
        scheduleExitStartOffset: 0,
        scheduleRejoinOffset: 0,
        scheduleCleanupOffset: 0,
        applied: false,
        rejoinCompleted: false,
        currentScale: 1,
        spacingScale: 1,
        cleanupBuffer: QUEUE_CLEANUP_BUFFER_MS,
        exitClearWindowBase: 0,
        exitClearWindowMin: QUEUE_EXIT_CLEAR_MIN_MS,
        rejoinTimestamp: null,
        cleanupTimestamp: null,
        licensePlate: typeof exitCar.licensePlate === 'string' ? exitCar.licensePlate : null,
      };
      let holdAccumBase = 0;

      holdOrder.forEach((car, idx) => {
        const marker = FREE_MARKER_POSITIONS[idx] || FREE_MARKER_POSITIONS[FREE_MARKER_POSITIONS.length - 1];
        const markerPosition = clonePositionArray(marker?.position || lookup[car.slotId] || QUEUE_CAR_SPAWN_POSITION);
        const startPosition = clonePositionArray(lookup[car.slotId] || QUEUE_CAR_SPAWN_POSITION);
        const travelDuration = getQueueTravelDuration(car.slotId);
        const detail = {
          id: car.id,
          baseStartOffset: holdAccumBase,
          scheduleStartOffset: 0,
          travelDuration,
          markerPosition,
          freeMarkerPosition: clonePositionArray(markerPosition),
          startPosition,
          originalSlotId: car.slotId,
          holdOrientation: Math.PI / 2,
          initialHeading: Array.isArray(car.headingLock) ? car.headingLock.slice() : SLOT_PARKING_HEADING,
        };
        plan.holdDetails.push(detail);
        plan.holdDetailsById.set(detail.id, detail);
        holdAccumBase += travelDuration + QUEUE_HOLD_GAP_MS;
      });

      const exitClearWindowBase = Math.max(QUEUE_EXIT_CLEAR_MIN_MS, Math.round(plan.exitDuration * QUEUE_EXIT_CLEAR_SCALE));
      plan.baseExitStartOffset = holdAccumBase + QUEUE_EXIT_START_GAP_MS;
      plan.baseRejoinOffset = plan.baseExitStartOffset + exitClearWindowBase;
      plan.exitClearWindowBase = exitClearWindowBase;

      if (queueRemovalTimeoutRef.current) {
        window.clearTimeout(queueRemovalTimeoutRef.current);
        queueRemovalTimeoutRef.current = null;
      }
      if (queueExitCleanupTimeoutRef.current) {
        window.clearTimeout(queueExitCleanupTimeoutRef.current);
        queueExitCleanupTimeoutRef.current = null;
      }

      currentRemovalPlanRef.current = plan;
      queueRemovalInProgressRef.current = true;
      setQueueRemovalActive(true);

      const scale = queueFastForwardRef.current && QUEUE_FAST_FORWARD_MULTIPLIER > 1
        ? 1 / QUEUE_FAST_FORWARD_MULTIPLIER
        : 1;

      const updated = applyRemovalPlanTimeline(plan, scale, { sourceCars: prev, referenceNow: now });

      return Array.isArray(updated) ? updated : prev;
    });
  }, [activeMinigame, applyRemovalPlanTimeline]);

  const processQueuedRemovals = useCallback(() => {
    if (queueRemovalInProgressRef.current) {
      return;
    }
    const pending = queuedRemovalIdsRef.current;
    if (!pending.length) {
      return;
    }

    const attempts = pending.length;
    for (let i = 0; i < attempts; i += 1) {
      const nextId = pending.shift();
      if (!nextId) {
        continue;
      }
      const nextCar = queueCarsRef.current.find((car) => car.id === nextId);
      if (!nextCar) {
        setSelectedQueueCarIds((current) => current.filter((id) => id !== nextId));
        continue;
      }
      if ((nextCar.phase ?? QUEUE_CAR_PHASE_SLOT) !== QUEUE_CAR_PHASE_SLOT) {
        pending.push(nextId);
        continue;
      }
      handleRemoveQueueCar(nextId);
      if (!queueRemovalInProgressRef.current) {
        // Removal failed to start; retry later without losing selection
        pending.push(nextId);
        continue;
      }
      break;
    }
  }, [handleRemoveQueueCar, setSelectedQueueCarIds]);
  processQueuedRemovalsRef.current = processQueuedRemovals;

  const handleQueueFastForwardPress = useCallback(() => {
    setQueueFastForward(true);
  }, []);

  const handleQueueFastForwardRelease = useCallback(() => {
    setQueueFastForward(false);
  }, []);

  useEffect(() => {
    if (!licenseModalMode) {
      return;
    }
    if (activeMinigame === licenseModalMode) {
      return;
    }
    setLicenseModalOpen(false);
    setLicenseModalError('');
    setLicenseInputValue('');
    setLicenseModalMode(null);
  }, [activeMinigame, licenseModalMode]);

  useEffect(() => {
    if (!licenseModalOpen) {
      return undefined;
    }
    const input = licenseInputRef.current;
    if (input) {
      try {
        input.focus({ preventScroll: true });
        input.select();
      } catch {}
    }
    if (typeof document === 'undefined') {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleLicenseModalClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    const { body } = document;
    const originalOverflow = body ? body.style.overflow : undefined;
    if (body) {
      body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (body && typeof originalOverflow === 'string') {
        body.style.overflow = originalOverflow;
      }
    };
  }, [licenseModalOpen, handleLicenseModalClose]);

  useEffect(() => {
    if (carOnInteractMarker && interactCountdown <= 0 && interactPhase === 'idle') {
      const schedule = typeof queueMicrotask === 'function' ? queueMicrotask : (fn) => Promise.resolve().then(fn);
      schedule(() => setInteractPhase('prompt'));
    }
  }, [carOnInteractMarker, interactCountdown, interactPhase]);

  useEffect(() => {
    if (!stackMinigameArmed || minigameLoading || activeMinigame === 'stack') {
      return;
    }
    if (!(carOnStackMarker && stackCountdown <= 0)) {
      return;
    }
    const schedule = typeof queueMicrotask === 'function' ? queueMicrotask : (fn) => Promise.resolve().then(fn);
    schedule(() => {
      setMinigameLoading(true);
      setMinigameLoadingStep(0);
      setMinigameLoadingMode('stack');
      setStackMinigameArmed(false);
      if (minigameLoadingTimeoutRef.current) {
        window.clearTimeout(minigameLoadingTimeoutRef.current);
        minigameLoadingTimeoutRef.current = null;
      }
      const timeoutId = window.setTimeout(() => {
        minigameLoadingTimeoutRef.current = null;
        minigameStateRef.current = {
          startTime: performance.now(),
          stacks: [],
        };
        setQueueCars([]);
        setSelectedQueueCarIds([]);
        queuedRemovalIdsRef.current = [];
        setActiveMinigame('stack');
        setMinigameLoading(false);
        setMinigameLoadingMode(null);
      }, QUEUE_LOADING_DELAY_MS);
      minigameLoadingTimeoutRef.current = timeoutId;
    });
  }, [carOnStackMarker, stackCountdown, activeMinigame, stackMinigameArmed, minigameLoading]);

  useEffect(() => {
    if (!queueMinigameArmed || minigameLoading || activeMinigame === 'queue') {
      return;
    }
    if (!(carOnQueueMarker && queueCountdown <= 0)) {
      return;
    }
    const schedule = typeof queueMicrotask === 'function' ? queueMicrotask : (fn) => Promise.resolve().then(fn);
    schedule(() => {
      setMinigameLoading(true);
      setMinigameLoadingStep(0);
      setMinigameLoadingMode('queue');
      setQueueMinigameArmed(false);
      if (minigameLoadingTimeoutRef.current) {
        window.clearTimeout(minigameLoadingTimeoutRef.current);
        minigameLoadingTimeoutRef.current = null;
      }
      const timeoutId = window.setTimeout(() => {
        minigameLoadingTimeoutRef.current = null;
        minigameStateRef.current = {
          startTime: performance.now(),
          queue: [],
        };
        setQueueCars([]);
        setSelectedQueueCarIds([]);
        queuedRemovalIdsRef.current = [];
        setActiveMinigame('queue');
        setMinigameLoading(false);
        setMinigameLoadingMode(null);
      }, QUEUE_LOADING_DELAY_MS);
      minigameLoadingTimeoutRef.current = timeoutId;
    });
  }, [carOnQueueMarker, queueCountdown, activeMinigame, queueMinigameArmed, minigameLoading]);

  useEffect(() => {
    if (activeMinigame === 'stack') {
      setJoystickVector(0, 0);
    }
  }, [activeMinigame]);

  useEffect(() => {
    if (typeof onStackMinigameChange === 'function') {
      try {
        onStackMinigameChange(activeMinigame === 'stack');
      } catch {}
    }
  }, [activeMinigame, onStackMinigameChange]);

  useEffect(() => {
    if (typeof onQueueMinigameChange === 'function') {
      try {
        onQueueMinigameChange(activeMinigame === 'queue');
      } catch {}
    }
  }, [activeMinigame, onQueueMinigameChange]);

  useEffect(() => {
    if (!minigameLoading || minigameLoadingMode !== 'stack') {
      return undefined;
    }
    if (carOnStackMarker && stackCountdown <= 0) {
      return undefined;
    }
    if (minigameLoadingTimeoutRef.current) {
      window.clearTimeout(minigameLoadingTimeoutRef.current);
      minigameLoadingTimeoutRef.current = null;
    }
    setMinigameLoading(false);
    setMinigameLoadingStep(0);
    setMinigameLoadingMode(null);
    setStackMinigameArmed(true);
    return undefined;
  }, [minigameLoading, minigameLoadingMode, carOnStackMarker, stackCountdown]);

  useEffect(() => {
    if (!minigameLoading || minigameLoadingMode !== 'queue') {
      return undefined;
    }
    if (carOnQueueMarker && queueCountdown <= 0) {
      return undefined;
    }
    if (minigameLoadingTimeoutRef.current) {
      window.clearTimeout(minigameLoadingTimeoutRef.current);
      minigameLoadingTimeoutRef.current = null;
    }
    setMinigameLoading(false);
    setMinigameLoadingStep(0);
    setMinigameLoadingMode(null);
    setQueueMinigameArmed(true);
    return undefined;
  }, [minigameLoading, minigameLoadingMode, carOnQueueMarker, queueCountdown]);

  useEffect(() => {
    queueFastForwardRef.current = queueFastForward;
    const plan = currentRemovalPlanRef.current;
    if (!plan || plan.rejoinCompleted) {
      return;
    }
    const scale = queueFastForward && QUEUE_FAST_FORWARD_MULTIPLIER > 1
      ? 1 / QUEUE_FAST_FORWARD_MULTIPLIER
      : 1;
    if (Math.abs((plan.currentScale ?? 1) - scale) < 0.001) {
      return;
    }
    applyRemovalPlanTimeline(plan, scale);
  }, [queueFastForward, applyRemovalPlanTimeline]);

  useEffect(() => {
    if (activeMinigame !== 'stack') {
      minigameStateRef.current = null;
      setQueueCars([]);
      setQueueFastForward(false);
      setSelectedQueueCarIds([]);
      queuedRemovalIdsRef.current = [];
      queueRemovalInProgressRef.current = false;
      setQueueRemovalActive(false);
      if (queueRemovalTimeoutRef.current) {
        window.clearTimeout(queueRemovalTimeoutRef.current);
        queueRemovalTimeoutRef.current = null;
      }
      if (queueExitCleanupTimeoutRef.current) {
        window.clearTimeout(queueExitCleanupTimeoutRef.current);
        queueExitCleanupTimeoutRef.current = null;
      }
      if (minigameLoadingTimeoutRef.current) {
        window.clearTimeout(minigameLoadingTimeoutRef.current);
        minigameLoadingTimeoutRef.current = null;
      }
      setMinigameLoading(false);
      setMinigameLoadingStep(0);
      setMinigameLoadingMode(null);
      currentRemovalPlanRef.current = null;
    }
  }, [activeMinigame]);

  useEffect(() => {
    if (!queueFastForward) {
      return undefined;
    }
    const stop = () => {
      setQueueFastForward(false);
    };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    return () => {
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      window.removeEventListener('blur', stop);
    };
  }, [queueFastForward]);

  useEffect(() => () => {
    if (queueRemovalTimeoutRef.current) {
      window.clearTimeout(queueRemovalTimeoutRef.current);
      queueRemovalTimeoutRef.current = null;
    }
    if (queueExitCleanupTimeoutRef.current) {
      window.clearTimeout(queueExitCleanupTimeoutRef.current);
      queueExitCleanupTimeoutRef.current = null;
    }
    if (minigameLoadingTimeoutRef.current) {
      window.clearTimeout(minigameLoadingTimeoutRef.current);
      minigameLoadingTimeoutRef.current = null;
    }
    currentRemovalPlanRef.current = null;
    queuedRemovalIdsRef.current = [];
    queueRemovalInProgressRef.current = false;
    setQueueRemovalActive(false);
    setMinigameLoadingMode(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let active = true;

    const loadFromLocalStorage = async () => {
      try {
        const stored = window.localStorage.getItem(LICENSE_STORAGE_KEY);
        if (stored) {
          const url = await resolveLicenseImageUrl(stored);
          if (url && active) {
            setLicenseImageUrl(url);
            return true;
          }
        }
      } catch {}
      return false;
    };

    const loadFromDatabase = async () => {
      const objectPath = await fetchLatestLicenseObjectPath();
      if (!objectPath) {
        return;
      }
      const resolvedUrl = await resolveLicenseImageUrl(objectPath);
      if (resolvedUrl && active) {
        setLicenseImageUrl(resolvedUrl);
        try {
          window.localStorage.setItem(LICENSE_STORAGE_KEY, objectPath);
        } catch {}
      }
    };

    const run = async () => {
      const hasLocal = await loadFromLocalStorage();
      if (!hasLocal) {
        await loadFromDatabase();
      }
    };

    run();

    const handleLicenseUpdated = (event) => {
      const detail = event && typeof event === 'object' && 'detail' in event ? event.detail : null;
      const objectPath = typeof detail === 'string' && detail.trim().length > 0 ? detail : null;
      if (!objectPath) {
        setLicenseImageUrl(DEFAULT_LICENSE_IMAGE);
        try {
          window.localStorage.removeItem(LICENSE_STORAGE_KEY);
        } catch {}
        return;
      }
      resolveLicenseImageUrl(objectPath).then((url) => {
        if (!url || !active) return;
        setLicenseImageUrl(url);
        try {
          window.localStorage.setItem(LICENSE_STORAGE_KEY, objectPath);
        } catch {}
      }).catch(() => {});
    };

    window.addEventListener(LICENSE_EVENT, handleLicenseUpdated);

    return () => {
      active = false;
      try {
        window.removeEventListener(LICENSE_EVENT, handleLicenseUpdated);
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!licenseImageUrl || licenseImageUrl === DEFAULT_LICENSE_IMAGE) {
      return undefined;
    }
    let cancelled = false;
    const validateImage = async () => {
      try {
        const res = await fetch(licenseImageUrl, { method: 'HEAD', cache: 'no-store' });
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
      } catch (err) {
        if (cancelled) return;
        console.warn('[InteractMarker] License image unreachable, falling back', err);
        setLicenseImageUrl(DEFAULT_LICENSE_IMAGE);
        try {
          window.localStorage.removeItem(LICENSE_STORAGE_KEY);
        } catch {}
      }
    };
    validateImage();
    return () => {
      cancelled = true;
    };
  }, [licenseImageUrl]);

  useEffect(() => {
    if (interactPhase === 'checking') {
      const timer = window.setTimeout(() => {
        setInteractPhase('approved');
      }, 1800);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [interactPhase]);

  useEffect(() => {
    if (interactPhase === 'approved' || interactPhase === 'complete') {
      setBarrierShouldOpen(true);
      return;
    }
    if (interactPhase === 'idle') {
      setBarrierShouldOpen(false);
    }
  }, [interactPhase]);

  const handleInteractPromptNext = useCallback(() => {
    setLicenseDropped(false);
    setIsDragOverDropzone(false);
    setInteractPhase('handover');
  }, []);

  const handleLicenseDragStart = useCallback((event) => {
    try {
      event.dataTransfer.setData('text/plain', 'drivers-license');
    } catch {}
  }, []);

  const handleDropZoneDragOver = useCallback((event) => {
    if (interactPhase !== 'handover') return;
    event.preventDefault();
    setIsDragOverDropzone(true);
  }, [interactPhase]);

  const handleDropZoneDragLeave = useCallback((event) => {
    if (event.relatedTarget && event.currentTarget.contains(event.relatedTarget)) {
      return;
    }
    setIsDragOverDropzone(false);
  }, []);

  const completeLicenseDrop = useCallback(() => {
    setIsDragOverDropzone(false);
    if (interactPhase !== 'handover') return;
    setLicenseDropped(true);
    setInteractPhase('checking');
  }, [interactPhase]);

  const handleLicenseDrop = useCallback((event) => {
    event.preventDefault();
    completeLicenseDrop();
  }, [completeLicenseDrop]);

  const handleInteractApprovedAcknowledge = useCallback(() => {
    setInteractPhase('complete');
  }, []);

  const handleLicenseDragEnd = useCallback(() => {
    setIsDragOverDropzone(false);
  }, []);

  const handleLicensePointerDown = useCallback((event) => {
    if (event.pointerType !== 'touch') return;
    if (interactPhase !== 'handover' || licenseDropped) return;
    event.preventDefault();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {}
    touchPointerIdRef.current = event.pointerId;
    touchStartRef.current = { x: event.clientX, y: event.clientY };
    setIsDragOverDropzone(false);
    setTouchDragState({ deltaX: 0, deltaY: 0 });
  }, [interactPhase, licenseDropped]);

  const handleLicensePointerMove = useCallback((event) => {
    if (event.pointerType !== 'touch') return;
    if (touchPointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    const deltaX = event.clientX - touchStartRef.current.x;
    const deltaY = event.clientY - touchStartRef.current.y;
    setTouchDragState({ deltaX, deltaY });
    const dropRect = dropZoneRef.current?.getBoundingClientRect();
    if (!dropRect) {
      return;
    }
    const inside = event.clientX >= dropRect.left
      && event.clientX <= dropRect.right
      && event.clientY >= dropRect.top
      && event.clientY <= dropRect.bottom;
    setIsDragOverDropzone(inside);
  }, []);

  const handleLicensePointerUp = useCallback((event) => {
    if (event.pointerType !== 'touch') return;
    if (touchPointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    let dropped = false;
    const dropRect = dropZoneRef.current?.getBoundingClientRect();
    if (dropRect) {
      const inside = event.clientX >= dropRect.left
        && event.clientX <= dropRect.right
        && event.clientY >= dropRect.top
        && event.clientY <= dropRect.bottom;
      if (inside) {
        completeLicenseDrop();
        dropped = true;
      }
    }
    if (!dropped) {
      setIsDragOverDropzone(false);
    }
    touchPointerIdRef.current = null;
    touchStartRef.current = { x: 0, y: 0 };
    setTouchDragState(null);
  }, [completeLicenseDrop]);

  const handleLicensePointerCancel = useCallback((event) => {
    if (event.pointerType !== 'touch') return;
    if (touchPointerIdRef.current !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {}
    setIsDragOverDropzone(false);
    touchPointerIdRef.current = null;
    touchStartRef.current = { x: 0, y: 0 };
    setTouchDragState(null);
  }, []);

  const licenseTouchStyle = useMemo(() => {
    if (!touchDragState) {
      return { touchAction: 'none' };
    }
    return {
      touchAction: 'none',
      transform: `translate3d(${touchDragState.deltaX}px, ${touchDragState.deltaY}px, 0)`,
    };
  }, [touchDragState]);

  return (
    <div className="relative w-full h-full">
      <Canvas shadows camera={{ position: [10, 18, 15], fov: 50 }} style={{ width: '100%', height: '100%' }}>
        <color attach="background" args={[ '#9cc9ff' ]} />
        <fog attach="fog" args={[ '#cde4ff', 80, 260 ]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[38, 52, 24]} intensity={1.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <Suspense fallback={null}>
          <Sky sunPosition={[30, 160, -20]} turbidity={6} rayleigh={2.2} mieCoefficient={0.005} mieDirectionalG={0.7} inclination={0.38} azimuth={0.12} />
          <ParkingArea />
          <StreetRoad />
          <ParkingToll />
          <RoadBarrier open={barrierShouldOpen} />
          <SecurityGuard />
          <GameMarker
            label="STACK"
            position={STACK_MARKER_POSITION}
            size={STACK_MARKER_SIZE}
            carRef={carRef}
            onPresenceChange={handleStackMarkerPresence}
            active={carOnStackMarker}
            colors={STACK_MARKER_COLORS}
          />
          <GameMarker
            label="QUEUE"
            position={QUEUE_MARKER_POSITION}
            size={QUEUE_MARKER_SIZE}
            carRef={carRef}
            onPresenceChange={handleQueueMarkerPresence}
            active={carOnQueueMarker}
            colors={QUEUE_MARKER_COLORS}
          />
          <GameMarker
            label="INTERACT"
            position={INTERACT_MARKER_POSITION}
            size={INTERACT_MARKER_SIZE}
            carRef={carRef}
            onPresenceChange={handleInteractMarkerPresence}
            active={carOnInteractMarker}
            colors={INTERACT_MARKER_COLORS}
          />
          <FloatingCountdown carRef={carRef} countdown={stackCountdown} active={carOnStackMarker} />
          <FloatingCountdown carRef={carRef} countdown={queueCountdown} active={carOnQueueMarker} />
          <FloatingCountdown carRef={carRef} countdown={interactCountdown} active={carOnInteractMarker} />
          {activeMinigame === 'stack' && (
            <>
              <QueueSlotMarkers slots={STACK_NUMBER_MARKER_POSITIONS} rotationY={Math.PI} />
              <FreeSlotMarkers slots={FREE_MARKER_POSITIONS} />
              <QueueCarFleet
                cars={queueCars}
                slotLookup={STACK_SLOT_LOOKUP}
                onToggleSelect={handleToggleQueueCarSelection}
                selectedCarIds={selectedQueueCarIds}
                fastForward={queueFastForward}
                selectionEnabled
                licenseStats={licenseStats}
                showStatsOverlay
              />
            </>
          )}
          {activeMinigame === 'queue' && (
            <>
              <QueueSlotMarkers slots={QUEUE_SLOT_POSITIONS} rotationY={0} />
              <QueueCarFleet
                cars={queueCars}
                slotLookup={QUEUE_SLOT_LOOKUP}
                fastForward={queueFastForward}
                selectionEnabled={false}
                licenseStats={licenseStats}
                showStatsOverlay
                tooltipOffset={QUEUE_CAR_TOOLTIP_OFFSET}
                tooltipScale={QUEUE_CAR_TOOLTIP_SCALE}
                tooltipBackground={QUEUE_CAR_TOOLTIP_BACKGROUND}
              />
            </>
          )}
          <Car
            onSpeedChange={setSpeed}
            carRef={carRef}
            controlsEnabled={!['stack', 'queue'].includes(activeMinigame)}
          />
          <Environment preset="sunset" background />
        </Suspense>
        <CameraRig
          targetRef={carRef}
          mode={activeMinigame}
          stackTarget={STACK_CAMERA_CONFIG}
          queueTarget={QUEUE_CAMERA_CONFIG}
          interactTarget={securityGuardCameraTarget}
          interactActive={interactCameraActive}
        />
        <Stats />
      </Canvas>
      <MobileJoystick active={joystickActive} />
      {showStackState && activeMinigame === 'stack' && (
        <StructureStateViewer
          slotState={queueSlotState}
          freeSlotState={queueHoldState}
          selectedIds={selectedQueueCarIds}
          title="Stack Snapshot"
          licenseStats={licenseStats}
        />
      )}
      {showQueueState && activeMinigame === 'queue' && (
        <StructureStateViewer
          slotState={queueSlotState}
          freeSlotState={queueHoldState}
          selectedIds={selectedQueueCarIds}
          title="Queue Snapshot"
          showFreeSlots={false}
          licenseStats={licenseStats}
        />
      )}
      <div className="pointer-events-none absolute right-4 bottom-24 z-10 select-none rounded-2xl bg-black/60 px-3 py-2 text-white ring-1 ring-white/20 backdrop-blur-sm sm:right-6 sm:bottom-28">
        <div className="text-xs uppercase tracking-wider text-white/80">Speed</div>
        <div className="mt-0.5 flex items-baseline gap-1">
          <div className="text-2xl font-extrabold tabular-nums">{Math.max(0, Math.round(Math.abs(speed) * 6))}</div>
          <div className="text-[10px] opacity-80">km/h</div>
        </div>
      </div>
      {minigameLoading && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="pointer-events-auto flex w-[min(90vw,22rem)] flex-col items-center gap-4 rounded-3xl bg-slate-900/85 px-6 py-6 text-center text-sky-100 shadow-2xl ring-1 ring-sky-400/30">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-sky-300/80">
              <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-sky-300" />
              {minigameLoadingMode === 'stack' ? 'Initializing stack' : 'Initializing queue'}
            </div>
            <div className="text-base font-semibold leading-relaxed sm:text-lg">{minigameLoadingMessage}</div>
            <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-sky-100/15">
              <div
                className="h-full bg-sky-400 transition-[width] duration-300 ease-out"
                style={{ width: `${minigameLoadingProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}
      {interactPhase === 'prompt' && interactCountdown <= 0 && carOnInteractMarker && (
        <div className="pointer-events-auto absolute left-1/2 bottom-12 z-20 w-[min(90vw,24rem)] -translate-x-1/2">
          <div className="relative mx-auto w-full">
            <Image
              src={SECURITY_GUARD_BUBBLE_IMAGE}
              alt="Security guard speech bubble"
              width={640}
              height={360}
              className="h-auto w-full drop-shadow-[0_18px_34px_rgba(15,23,42,0.58)]"
              sizes="(max-width: 640px) 90vw, 384px"
              priority={false}
            />
            <div className="absolute inset-0 flex flex-col px-8 pb-26 pt-45 text-white">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-200">Security Guard</div>
              <div className="mt-3 text-sm leading-relaxed text-sky-50">
                Good afternoon! Before you head in, may I see your driver&apos;s license, please?
              </div>
              <div className="mt-auto flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleInteractPromptNext}
                  className="inline-flex items-center justify-center rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {interactPhase === 'handover' && (
        <div className="pointer-events-auto absolute inset-0 z-20 flex flex-col">
          <div className="relative flex-[0_0_52%] overflow-hidden">
            <div
              className="absolute inset-0 bg-slate-900/90"
              style={{ backgroundImage: "url('/desk_topview.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
            />
            <div className="relative z-10 flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center text-sky-50 sm:gap-5">
              <div className="text-xs uppercase tracking-[0.22em] text-sky-200">Security Desk</div>
              <p className="max-w-md text-sm leading-relaxed text-sky-100 sm:text-base">
                Slide your license up onto the counter so I can inspect it.
              </p>
              <div
                ref={dropZoneRef}
                onDragOver={handleDropZoneDragOver}
                onDrop={handleLicenseDrop}
                onDragLeave={handleDropZoneDragLeave}
                className={`flex h-40 w-[min(90vw,28rem)] items-center justify-center rounded-3xl border-2 border-dashed text-base font-semibold tracking-wide shadow-xl transition ${licenseDropped ? 'border-emerald-300 bg-emerald-600/20 text-emerald-100' : isDragOverDropzone ? 'border-sky-300 bg-sky-500/15 text-sky-100' : 'border-white/35 bg-slate-900/40 text-white/70'}`}
              >
                {licenseDropped ? (
                  <Image
                    src={currentLicenseImageSrc}
                    alt="Submitted license"
                    width={420}
                    height={260}
                    draggable={false}
                    className="h-32 w-auto rounded-2xl border border-white/30 bg-white/90 p-3 text-slate-900 shadow-2xl"
                    sizes="320px"
                  />
                ) : (
                  <span>Drop license here</span>
                )}
              </div>
            </div>
          </div>
          <div className="relative flex-1 bg-slate-950/92 px-6 pb-10 pt-8 text-sky-50 sm:pb-12">
            <div className="mx-auto flex h-full max-w-3xl flex-col items-center justify-center gap-6 text-center">
              <div className="space-y-2">
                <div className="text-xs uppercase tracking-[0.18em] text-sky-300">Your License</div>
                <p className="text-sm text-sky-100 sm:text-base">Drag the card upward toward the counter to hand it over.</p>
              </div>
              {!licenseDropped && (
                <Image
                  src={currentLicenseImageSrc}
                  alt="Driver&apos;s license"
                  width={500}
                  height={310}
                  draggable
                  onDragStart={handleLicenseDragStart}
                  onDragEnd={handleLicenseDragEnd}
                  onPointerDown={handleLicensePointerDown}
                  onPointerMove={handleLicensePointerMove}
                  onPointerUp={handleLicensePointerUp}
                  onPointerCancel={handleLicensePointerCancel}
                  className="h-40 w-auto cursor-grab rounded-3xl border-2 border-white/35 bg-white/90 p-4 text-slate-900 shadow-2xl transition hover:scale-[1.05] active:cursor-grabbing"
                  style={licenseTouchStyle}
                  sizes="(max-width: 640px) 280px, 360px"
                />
              )}
            </div>
          </div>
        </div>
      )}
      {interactPhase === 'checking' && (
        <div className="pointer-events-none absolute left-1/2 bottom-12 z-20 w-[min(90vw,24rem)] -translate-x-1/2">
          <div className="relative mx-auto w-full">
            <Image
              src={SECURITY_GUARD_BUBBLE_IMAGE}
              alt="Security guard checking bubble"
              width={640}
              height={360}
              className="h-auto w-full drop-shadow-[0_18px_34px_rgba(15,23,42,0.58)]"
              sizes="(max-width: 640px) 90vw, 384px"
            />
            <div className="absolute inset-0 flex flex-col px-8 pb-26 pt-45 text-white">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-200">Security Guard</div>
              <div className="mt-3 text-sm leading-relaxed text-sky-50">
                Alright, let me take a quick look at this.
              </div>
              <div className="mt-auto flex items-center gap-2 pt-4 text-xs uppercase tracking-[0.3em] text-sky-200/80">
                <span className="inline-flex h-2 w-2 animate-ping rounded-full bg-sky-300" />
                Checking license…
              </div>
            </div>
          </div>
        </div>
      )}
      {interactPhase === 'approved' && (
        <div className="pointer-events-auto absolute left-1/2 bottom-12 z-20 w-[min(90vw,24rem)] -translate-x-1/2">
          <div className="relative mx-auto w-full">
            <Image
              src={SECURITY_GUARD_SMILING_BUBBLE_IMAGE}
              alt="Security guard smiling speech bubble"
              width={640}
              height={360}
              className="h-auto w-full drop-shadow-[0_18px_34px_rgba(6,95,70,0.55)]"
              sizes="(max-width: 640px) 90vw, 384px"
            />
            <div className="absolute inset-0 flex flex-col px-8 pb-26 pt-45 text-white">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-200">Security Guard</div>
              <div className="mt-3 text-sm leading-relaxed text-emerald-50">
                Looks good. You&apos;re all set—enjoy your time inside!
              </div>
              <div className="mt-auto flex justify-end pt-4">
                <button
                  type="button"
                  onClick={handleInteractApprovedAcknowledge}
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                >
                  Thanks!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {licenseModalOpen && licenseModalMode && (
        <div className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900/90 p-6 text-white shadow-[0_18px_45px_rgba(15,23,42,0.6)] ring-1 ring-white/20">
            <form onSubmit={handleLicenseModalSubmit} className="flex flex-col gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.24em] text-sky-300/85">{licenseModalHeading}</div>
                <h2 className="mt-1 text-lg font-semibold tracking-tight">Assign a license plate</h2>
                <p className="mt-1 text-sm text-white/70">{licenseModalBody}</p>
              </div>
              <label htmlFor={licenseModalInputId} className="text-[11px] uppercase tracking-[0.28em] text-white/55">
                License plate
              </label>
              <input
                id={licenseModalInputId}
                ref={licenseInputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={LICENSE_PLATE_MAX_LENGTH}
                value={licenseInputValue}
                onChange={handleLicenseInputChange}
                className="w-full rounded-2xl border border-white/25 bg-white/12 px-4 py-3 text-base font-semibold uppercase tracking-[0.2em] text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-300"
                placeholder="e.g. 12 or ABC-123"
              />
              {licenseModalError ? (
                <div className="text-xs font-medium text-rose-300">{licenseModalError}</div>
              ) : (
                <div className="text-xs text-white/50">Use letters, numbers, or hyphen (max {LICENSE_PLATE_MAX_LENGTH}).</div>
              )}
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleLicenseModalClose}
                  className="inline-flex items-center justify-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-white/16 focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] text-white shadow ring-1 ring-emerald-300/40 transition hover:bg-emerald-400/90 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!licenseInputValue.length}
                >
                  Spawn car
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {activeMinigame === 'stack' && (
        <div className="pointer-events-none absolute right-4 top-4 z-40 sm:right-6 sm:top-6">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={queueFastForward}
              onPointerDown={handleQueueFastForwardPress}
              onPointerUp={handleQueueFastForwardRelease}
              onPointerLeave={handleQueueFastForwardRelease}
              onPointerCancel={handleQueueFastForwardRelease}
              onKeyDown={(event) => {
                if (!event.repeat && (event.key === ' ' || event.key === 'Enter')) {
                  event.preventDefault();
                  handleQueueFastForwardPress();
                }
              }}
              onKeyUp={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  handleQueueFastForwardRelease();
                }
              }}
              onBlur={handleQueueFastForwardRelease}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow ring-1 transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${queueFastForward ? 'bg-sky-300 text-slate-900 ring-sky-100/60' : 'bg-sky-500/90 text-white ring-sky-300/40 hover:bg-sky-400/90'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5v14l6-7zm8 0v14l6-7z"/></svg>
              Fast forward
            </button>
            <button
              type="button"
              onClick={handleQueueMoveSelected}
              disabled={selectedQueueCarIds.length === 0}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow ring-1 transition focus:outline-none focus:ring-2 focus:ring-amber-200 ${selectedQueueCarIds.length ? 'bg-amber-500/90 text-white ring-amber-300/40 hover:bg-amber-400/90' : 'cursor-not-allowed bg-amber-500/40 text-amber-100/70 ring-amber-200/30'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4h2v16H5zm12 0h2v16h-2zM9 4l8 8-8 8z"/></svg>
              Move selected
              {selectedQueueCarIds.length > 0 && (
                <span className="inline-flex h-5 min-w-[1.5rem] items-center justify-center rounded-full bg-white/20 px-2 text-xs font-semibold">
                  {selectedQueueCarIds.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleAddQueueCar}
              disabled={queueIsFull}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-500/90 px-3 py-2 text-sm font-semibold text-white shadow ring-1 ring-emerald-300/40 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
              Add car
            </button>
            <button
              type="button"
              onClick={() => setActiveMinigame(null)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-2 text-sm font-semibold text-white shadow ring-1 ring-white/25 transition hover:bg-slate-800/80"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              Back to free roam
            </button>
          </div>
        </div>
      )}
      {activeMinigame === 'queue' && (
        <div className="pointer-events-none absolute right-4 top-4 z-40 sm:right-6 sm:top-6">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-pressed={queueFastForward}
              onPointerDown={handleQueueFastForwardPress}
              onPointerUp={handleQueueFastForwardRelease}
              onPointerLeave={handleQueueFastForwardRelease}
              onPointerCancel={handleQueueFastForwardRelease}
              onKeyDown={(event) => {
                if (!event.repeat && (event.key === ' ' || event.key === 'Enter')) {
                  event.preventDefault();
                  handleQueueFastForwardPress();
                }
              }}
              onKeyUp={(event) => {
                if (event.key === ' ' || event.key === 'Enter') {
                  handleQueueFastForwardRelease();
                }
              }}
              onBlur={handleQueueFastForwardRelease}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow ring-1 transition focus:outline-none focus:ring-2 focus:ring-sky-200 ${queueFastForward ? 'bg-sky-300 text-slate-900 ring-sky-100/60' : 'bg-sky-500/90 text-white ring-sky-300/40 hover:bg-sky-400/90'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 5v14l6-7zm8 0v14l6-7z"/></svg>
              Fast forward
            </button>
            <button
              type="button"
              onClick={handleAddQueueCar}
              disabled={queueIsFull || queueRemovalActive}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow ring-1 ring-emerald-300/40 transition focus:outline-none focus:ring-2 focus:ring-emerald-200 ${queueIsFull || queueRemovalActive ? 'cursor-not-allowed bg-emerald-500/45 text-emerald-100/70' : 'bg-emerald-500/90 text-white hover:bg-emerald-400/90'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 11h-6V5h-2v6H5v2h6v6h2v-6h6z"/></svg>
              Add car
            </button>
            <button
              type="button"
              onClick={handleQueueDequeueFront}
              disabled={!queueHasRemovable || queueRemovalActive}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold shadow ring-1 ring-rose-300/40 transition focus:outline-none focus:ring-2 focus:ring-rose-200 ${!queueHasRemovable || queueRemovalActive ? 'cursor-not-allowed bg-rose-500/45 text-rose-100/70' : 'bg-rose-500/90 text-white hover:bg-rose-400/90'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M5 11h14v2H5z"/></svg>
              Remove front car
              {queueRemovalActive && (
                <span className="ml-1.5 inline-flex h-2 w-2 animate-ping rounded-full bg-rose-100/80" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveMinigame(null)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-3 py-2 text-sm font-semibold text-white shadow ring-1 ring-white/25 transition hover:bg-slate-800/80"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
              Back to free roam
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Ensure model is preloaded when module evaluated (optional redundancy)
try {
  if (useGLTF.preload) {
    useGLTF.preload('/car-show/models/car/scene.gltf');
    useGLTF.preload('/models/modern_parking_area.glb');
    QUEUE_CAR_MODEL_PATHS.forEach((path) => useGLTF.preload(path));
  }
} catch {}
