/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { LayoutObject, LayoutObjectType } from '../../types';

// Shared materials cache to eliminate duplicate allocations and GC pressure
const materialsCache = new Map<string, THREE.Material>();

let cachedShadowTexture: THREE.CanvasTexture | null = null;
function getRadialShadowTexture(): THREE.CanvasTexture {
  if (!cachedShadowTexture) {
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 64;
    shadowCanvas.height = 64;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 64);
    }
    cachedShadowTexture = new THREE.CanvasTexture(shadowCanvas);
    cachedShadowTexture.colorSpace = THREE.SRGBColorSpace;
  }
  return cachedShadowTexture;
}

function getPbrMaterial(key: string, params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
  if (!materialsCache.has(key)) {
    materialsCache.set(key, new THREE.MeshStandardMaterial(params));
  }
  return materialsCache.get(key) as THREE.MeshStandardMaterial;
}

/**
 * Creates composite 3–12 part procedural models for each venue object type.
 * Each object sits flush with the ground (bottom-center pivot).
 */
export function buildCompositeModel(item: LayoutObject, isSelected: boolean = false): THREE.Group {
  const root = new THREE.Group();
  root.name = item.id;
  root.userData = { id: item.id, item };

  const isRelocated = item.status === 'relocated';
  const isFlooded = item.status === 'flooded';

  // Base selection emissive tint if selected
  const selectionEmissive = isSelected ? new THREE.Color(0xc59b27).multiplyScalar(0.35) : new THREE.Color(0x000000);

  switch (item.type) {
    case 'stage': {
      // 1. Stage Deck Platform (Primary)
      const deckGeo = new THREE.BoxGeometry(7, 0.7, 4.5);
      const deckMat = getPbrMaterial('stage_deck', {
        color: 0x1f2421,
        roughness: 0.65,
        metalness: 0.15,
      });
      const deck = new THREE.Mesh(deckGeo, deckMat);
      deck.position.y = 0.35;
      deck.castShadow = true;
      deck.receiveShadow = true;
      root.add(deck);

      // 2. Stage Skirt (Front & sides)
      const skirtGeo = new THREE.BoxGeometry(7.05, 0.35, 4.55);
      const skirtMat = getPbrMaterial('stage_skirt', {
        color: 0x0d3b2e, // Deep emerald skirt
        roughness: 0.85,
        metalness: 0.05,
      });
      const skirt = new THREE.Mesh(skirtGeo, skirtMat);
      skirt.position.y = 0.175;
      root.add(skirt);

      // 3. Stage Steps (Front Center)
      const stepsGeo = new THREE.BoxGeometry(2, 0.35, 0.8);
      const steps = new THREE.Mesh(stepsGeo, deckMat);
      steps.position.set(0, 0.175, 2.65);
      steps.receiveShadow = true;
      root.add(steps);

      // 4 & 5. Left and Right Vertical Truss Pillars (Secondary)
      const trussGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.8, 8);
      const trussMat = getPbrMaterial('stage_truss', {
        color: 0xd6d9db,
        roughness: 0.25,
        metalness: 0.9,
      });

      const trussLeft = new THREE.Mesh(trussGeo, trussMat);
      trussLeft.position.set(-3.2, 1.9, -1.9);
      root.add(trussLeft);

      const trussRight = new THREE.Mesh(trussGeo, trussMat);
      trussRight.position.set(3.2, 1.9, -1.9);
      root.add(trussRight);

      // 6. Crossbar Top Rigging Beam
      const crossbarGeo = new THREE.CylinderGeometry(0.07, 0.07, 6.6, 8);
      const crossbar = new THREE.Mesh(crossbarGeo, trussMat);
      crossbar.rotation.z = Math.PI / 2;
      crossbar.position.set(0, 3.8, -1.9);
      root.add(crossbar);

      // 7 & 8. Par-Can Stage Lighting Spots (Accents)
      const spotGeo = new THREE.ConeGeometry(0.18, 0.35, 8);
      const spotMat = getPbrMaterial('stage_spotlight', {
        color: 0x333333,
        roughness: 0.4,
        metalness: 0.8,
      });
      const spotL = new THREE.Mesh(spotGeo, spotMat);
      spotL.position.set(-1.8, 3.65, -1.9);
      spotL.rotation.x = Math.PI / 4;
      root.add(spotL);

      const spotR = new THREE.Mesh(spotGeo, spotMat);
      spotR.position.set(1.8, 3.65, -1.9);
      spotR.rotation.x = Math.PI / 4;
      root.add(spotR);

      // 9. Ceremonial Speaker Podium / Lectern
      const podiumGeo = new THREE.BoxGeometry(0.7, 1.1, 0.5);
      const podiumMat = getPbrMaterial('stage_podium', {
        color: 0x2e1a0f, // Polished rosewood
        roughness: 0.35,
        metalness: 0.1,
      });
      const podium = new THREE.Mesh(podiumGeo, podiumMat);
      podium.position.set(0, 1.25, 0.8);
      podium.castShadow = true;
      root.add(podium);

      // 10. Gold Mic on Lectern (Accent)
      const micGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 6);
      const micMat = getPbrMaterial('stage_mic', {
        color: 0xc59b27,
        roughness: 0.2,
        metalness: 0.95,
      });
      const mic = new THREE.Mesh(micGeo, micMat);
      mic.position.set(0, 1.85, 0.7);
      mic.rotation.x = -Math.PI / 6;
      root.add(mic);

      break;
    }

    case 'round_table': {
      // 1. Circular Table Top (Primary)
      const topGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.08, 24);
      const topMat = getPbrMaterial('table_linen', {
        color: 0xfaf8f5, // Warm ivory tablecloth
        roughness: 0.9,
        metalness: 0.0,
      });
      const tableTop = new THREE.Mesh(topGeo, topMat);
      tableTop.position.y = 0.76;
      tableTop.castShadow = true;
      tableTop.receiveShadow = true;
      root.add(tableTop);

      // 2. Table Drop Linen Skirt
      const dropGeo = new THREE.CylinderGeometry(1.21, 1.25, 0.45, 24, 1, true);
      const drop = new THREE.Mesh(dropGeo, topMat);
      drop.position.y = 0.52;
      root.add(drop);

      // 3. Central Pedestal Column
      const columnGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.72, 12);
      const columnMat = getPbrMaterial('table_base', {
        color: 0x2a2a2a,
        roughness: 0.4,
        metalness: 0.8,
      });
      const col = new THREE.Mesh(columnGeo, columnMat);
      col.position.y = 0.36;
      root.add(col);

      // 4. Heavy Brass Base Disk
      const baseGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.04, 16);
      const base = new THREE.Mesh(baseGeo, columnMat);
      base.position.y = 0.02;
      root.add(base);

      // 5. Centerpiece Floral Vase (Accent)
      const vaseGeo = new THREE.CylinderGeometry(0.1, 0.14, 0.28, 12);
      const vaseMat = getPbrMaterial('table_vase', {
        color: 0xc59b27, // Champagne gold vase
        roughness: 0.25,
        metalness: 0.85,
      });
      const vase = new THREE.Mesh(vaseGeo, vaseMat);
      vase.position.y = 0.94;
      root.add(vase);

      // 6. Centerpiece Foliage
      const floralGeo = new THREE.SphereGeometry(0.2, 8, 8);
      const floralMat = getPbrMaterial('table_flowers', {
        color: 0x165342, // Emerald foliage
        roughness: 0.7,
        metalness: 0.1,
      });
      const flowers = new THREE.Mesh(floralGeo, floralMat);
      flowers.position.y = 1.12;
      root.add(flowers);

      // 7-12. 6 Banquet Chairs arranged radially around the table
      const chairSeatGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.06, 12);
      const chairBackGeo = new THREE.BoxGeometry(0.36, 0.42, 0.04);
      const chairMat = getPbrMaterial('chair_emerald', {
        color: 0x0d3b2e,
        roughness: 0.75,
        metalness: 0.1,
      });
      const chairFrameMat = getPbrMaterial('chair_gold_frame', {
        color: 0xc59b27,
        roughness: 0.3,
        metalness: 0.9,
      });

      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2) / 6;
        const chairGroup = new THREE.Group();
        chairGroup.position.set(Math.cos(angle) * 1.55, 0, Math.sin(angle) * 1.55);
        chairGroup.rotation.y = -angle + Math.PI / 2;

        const seat = new THREE.Mesh(chairSeatGeo, chairMat);
        seat.position.y = 0.44;
        seat.castShadow = true;
        chairGroup.add(seat);

        const back = new THREE.Mesh(chairBackGeo, chairMat);
        back.position.set(0, 0.68, 0.2);
        chairGroup.add(back);

        const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.44, 6);
        const leg = new THREE.Mesh(legGeo, chairFrameMat);
        leg.position.set(0, 0.22, 0);
        chairGroup.add(leg);

        root.add(chairGroup);
      }
      break;
    }

    case 'buffet_station': {
      // 1. Long Counter Table Top (Primary)
      const topGeo = new THREE.BoxGeometry(4.2, 0.1, 1.2);
      const topMat = getPbrMaterial('buffet_top', {
        color: 0x24272a, // Black granite / quartz
        roughness: 0.2,
        metalness: 0.3,
      });
      const top = new THREE.Mesh(topGeo, topMat);
      top.position.y = 0.9;
      top.castShadow = true;
      root.add(top);

      // 2. Base Front Panel (Emerald fluting)
      const baseGeo = new THREE.BoxGeometry(4.1, 0.85, 1.1);
      const baseMat = getPbrMaterial('buffet_base', {
        color: 0x0d3b2e,
        roughness: 0.6,
        metalness: 0.1,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.425;
      root.add(base);

      // 3. Gold Trim Band (Accent)
      const trimGeo = new THREE.BoxGeometry(4.22, 0.05, 1.22);
      const trimMat = getPbrMaterial('buffet_trim', {
        color: 0xc59b27,
        roughness: 0.3,
        metalness: 0.85,
      });
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.y = 0.85;
      root.add(trim);

      // 4, 5, 6. Stainless Steel Chafing Dishes (Hot food pans)
      const chaferGeo = new THREE.BoxGeometry(0.7, 0.22, 0.5);
      const chaferMat = getPbrMaterial('buffet_chafer', {
        color: 0xe5e7eb,
        roughness: 0.15,
        metalness: 0.95,
      });
      const lidGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.7, 12, 1, false, 0, Math.PI);

      [-1.3, 0, 1.3].forEach((posX) => {
        const chafer = new THREE.Mesh(chaferGeo, chaferMat);
        chafer.position.set(posX, 1.05, 0);
        chafer.castShadow = true;
        root.add(chafer);

        const lid = new THREE.Mesh(lidGeo, chaferMat);
        lid.rotation.z = Math.PI / 2;
        lid.position.set(posX, 1.22, 0);
        root.add(lid);
      });

      // 7. Sneeze Guard Acrylic Shield (Transparent)
      const guardGeo = new THREE.BoxGeometry(4.0, 0.4, 0.04);
      const guardMat = getPbrMaterial('buffet_guard', {
        color: 0xdff0ea,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.45,
      });
      const guard = new THREE.Mesh(guardGeo, guardMat);
      guard.position.set(0, 1.25, 0.45);
      root.add(guard);
      break;
    }

    case 'arch_entrance': {
      // 1 & 2. Dual Classical Entry Pillars (Primary)
      const colGeo = new THREE.BoxGeometry(0.65, 3.2, 0.65);
      const stoneMat = getPbrMaterial('arch_stone', {
        color: 0xf3efea, // Warm architectural stone
        roughness: 0.7,
        metalness: 0.05,
      });
      const colL = new THREE.Mesh(colGeo, stoneMat);
      colL.position.set(-2.0, 1.6, 0);
      colL.castShadow = true;
      root.add(colL);

      const colR = new THREE.Mesh(colGeo, stoneMat);
      colR.position.set(2.0, 1.6, 0);
      colR.castShadow = true;
      root.add(colR);

      // 3. Top Arch Header Beam
      const beamGeo = new THREE.BoxGeometry(4.8, 0.5, 0.7);
      const beam = new THREE.Mesh(beamGeo, stoneMat);
      beam.position.set(0, 3.45, 0);
      root.add(beam);

      // 4. Gold Welcome Cartouche Plaque
      const plaqueGeo = new THREE.BoxGeometry(2.4, 0.35, 0.05);
      const plaqueMat = getPbrMaterial('arch_plaque', {
        color: 0xc59b27,
        roughness: 0.25,
        metalness: 0.9,
      });
      const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
      plaque.position.set(0, 3.45, 0.38);
      root.add(plaque);

      // 5. Ceremonial Red/Emerald Welcome Carpet Runner
      const carpetGeo = new THREE.BoxGeometry(2.8, 0.02, 6.0);
      const carpetMat = getPbrMaterial('arch_carpet', {
        color: 0x0d3b2e, // Deep emerald ceremonial carpet
        roughness: 0.95,
        metalness: 0.0,
      });
      const carpet = new THREE.Mesh(carpetGeo, carpetMat);
      carpet.position.set(0, 0.01, 0);
      carpet.receiveShadow = true;
      root.add(carpet);

      // 6 & 7. Classical Top Urns
      const urnGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.45, 12);
      const urnL = new THREE.Mesh(urnGeo, stoneMat);
      urnL.position.set(-2.0, 3.92, 0);
      root.add(urnL);

      const urnR = new THREE.Mesh(urnGeo, stoneMat);
      urnR.position.set(2.0, 3.92, 0);
      root.add(urnR);
      break;
    }

    case 'speaker_tower': {
      // 1. Heavy Outrigger Base Plate (Primary)
      const baseGeo = new THREE.BoxGeometry(1.4, 0.2, 1.4);
      const baseMat = getPbrMaterial('audio_base', {
        color: 0x1f2421,
        roughness: 0.5,
        metalness: 0.8,
      });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 0.1;
      root.add(base);

      // 2. Twin Subwoofers on floor
      const subGeo = new THREE.BoxGeometry(1.1, 0.8, 0.9);
      const cabMat = getPbrMaterial('audio_cab', {
        color: 0x111315,
        roughness: 0.7,
        metalness: 0.2,
      });
      const sub = new THREE.Mesh(subGeo, cabMat);
      sub.position.set(0, 0.6, 0);
      sub.castShadow = true;
      root.add(sub);

      // 3. Tall Aluminum Vertical Truss Tower
      const towerGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.2, 8);
      const trussMat = getPbrMaterial('audio_truss', {
        color: 0xd6d9db,
        roughness: 0.25,
        metalness: 0.9,
      });
      const tower = new THREE.Mesh(towerGeo, trussMat);
      tower.position.set(0, 2.3, 0);
      root.add(tower);

      // 4-7. 4 Curved Line Array Speaker Modules suspended at top
      const arrayBoxGeo = new THREE.BoxGeometry(0.85, 0.32, 0.55);
      for (let i = 0; i < 4; i++) {
        const box = new THREE.Mesh(arrayBoxGeo, cabMat);
        const yPos = 3.6 - i * 0.36;
        const tilt = 0.05 + i * 0.08;
        box.position.set(0, yPos, 0.25 + i * 0.08);
        box.rotation.x = tilt;
        root.add(box);
      }
      break;
    }

    case 'canopy_tent': {
      // 1. 4 Corner Aluminum Upright Poles (Primary)
      const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8);
      const poleMat = getPbrMaterial('tent_pole', {
        color: 0xd4d8dc,
        roughness: 0.3,
        metalness: 0.85,
      });
      const halfSize = 2.2;
      [
        [-halfSize, -halfSize],
        [halfSize, -halfSize],
        [-halfSize, halfSize],
        [halfSize, halfSize],
      ].forEach(([px, pz]) => {
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.set(px, 1.4, pz);
        root.add(pole);
      });

      // 2. High-Peak Fabric Canopy Roof (Secondary)
      const roofGeo = new THREE.ConeGeometry(3.5, 1.4, 4);
      const roofMat = getPbrMaterial('tent_fabric', {
        color: 0xf3efea, // Clean ivory marquee fabric
        roughness: 0.85,
        metalness: 0.0,
      });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.rotation.y = Math.PI / 4;
      roof.position.y = 3.5;
      roof.castShadow = true;
      root.add(roof);

      // 3. Gold Crown Finial (Accent)
      const finialGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const finialMat = getPbrMaterial('tent_finial', {
        color: 0xc59b27,
        roughness: 0.2,
        metalness: 0.95,
      });
      const finial = new THREE.Mesh(finialGeo, finialMat);
      finial.position.y = 4.25;
      root.add(finial);
      break;
    }

    case 'lounge_set': {
      // 1. Tufted Modern Sofa (Primary)
      const sofaBaseGeo = new THREE.BoxGeometry(2.4, 0.35, 0.9);
      const sofaMat = getPbrMaterial('lounge_sofa', {
        color: 0x0d3b2e, // Luxury emerald upholstery
        roughness: 0.8,
        metalness: 0.1,
      });
      const sofaBase = new THREE.Mesh(sofaBaseGeo, sofaMat);
      sofaBase.position.set(0, 0.25, -0.6);
      sofaBase.castShadow = true;
      root.add(sofaBase);

      const sofaBackGeo = new THREE.BoxGeometry(2.4, 0.55, 0.25);
      const sofaBack = new THREE.Mesh(sofaBackGeo, sofaMat);
      sofaBack.position.set(0, 0.7, -0.95);
      root.add(sofaBack);

      // 2. Glass & Brass Coffee Table
      const tableGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.04, 16);
      const glassMat = getPbrMaterial('lounge_glass', {
        color: 0xdff0ea,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.5,
      });
      const table = new THREE.Mesh(tableGeo, glassMat);
      table.position.set(0, 0.42, 0.4);
      root.add(table);

      const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 8);
      const legMat = getPbrMaterial('lounge_brass_legs', {
        color: 0xc59b27,
        roughness: 0.25,
        metalness: 0.9,
      });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(0, 0.2, 0.4);
      root.add(leg);

      // 3. Geometric Woven Area Rug Underneath
      const rugGeo = new THREE.BoxGeometry(3.2, 0.02, 2.6);
      const rugMat = getPbrMaterial('lounge_rug', {
        color: 0xf3efea,
        roughness: 0.95,
        metalness: 0.0,
      });
      const rug = new THREE.Mesh(rugGeo, rugMat);
      rug.position.set(0, 0.01, 0);
      rug.receiveShadow = true;
      root.add(rug);
      break;
    }

    case 'seating_row': {
      // Composite Seating Row: 5 linked auditorium/banquet chairs on a shared structural beam
      const frameMat = getPbrMaterial('seating_frame', {
        color: 0x222629,
        roughness: 0.4,
        metalness: 0.8,
      });
      const cushionMat = getPbrMaterial('seating_cushion', {
        color: isRelocated ? 0x165342 : 0x0d3b2e, // Emerald velvet upholstery
        roughness: 0.75,
        metalness: 0.05,
      });
      const accentMat = getPbrMaterial('seating_brass_accent', {
        color: 0xc59b27,
        roughness: 0.3,
        metalness: 0.85,
      });

      // 1. Structural Base Rail Beam (4.2m width)
      const baseRailGeo = new THREE.BoxGeometry(4.2, 0.06, 0.08);
      const baseRail = new THREE.Mesh(baseRailGeo, frameMat);
      baseRail.position.set(0, 0.18, 0);
      baseRail.castShadow = true;
      root.add(baseRail);

      // 2. Floor Mount Legs (Left, Center, Right)
      [-1.9, 0, 1.9].forEach((xPos) => {
        const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.36, 8);
        const leg = new THREE.Mesh(legGeo, frameMat);
        leg.position.set(xPos, 0.18, 0);
        leg.castShadow = true;
        root.add(leg);

        const footGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12);
        const foot = new THREE.Mesh(footGeo, accentMat);
        foot.position.set(xPos, 0.01, 0);
        root.add(foot);
      });

      // 3. 5 Linked Padded Auditorium Chairs
      const chairSpacing = 0.8;
      for (let i = -2; i <= 2; i++) {
        const cx = i * chairSpacing;

        // Seat Cushion
        const seatGeo = new THREE.BoxGeometry(0.62, 0.08, 0.52);
        const seat = new THREE.Mesh(seatGeo, cushionMat);
        seat.position.set(cx, 0.45, 0);
        seat.castShadow = true;
        seat.receiveShadow = true;
        root.add(seat);

        // Chair Backrest
        const backGeo = new THREE.BoxGeometry(0.6, 0.46, 0.07);
        const back = new THREE.Mesh(backGeo, cushionMat);
        back.position.set(cx, 0.76, -0.24);
        back.rotation.x = 0.08; // Ergonomic subtle tilt
        back.castShadow = true;
        root.add(back);

        // Chair Back Support Post
        const postGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
        const post = new THREE.Mesh(postGeo, frameMat);
        post.position.set(cx, 0.55, -0.22);
        root.add(post);
      }

      // 4. End-of-row Aisle Plate
      const aislePlateGeo = new THREE.BoxGeometry(0.05, 0.15, 0.25);
      const aislePlate = new THREE.Mesh(aislePlateGeo, accentMat);
      aislePlate.position.set(2.12, 0.5, 0);
      root.add(aislePlate);
      break;
    }

    default: {
      // Fallback clean box
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.8, 1.5),
        getPbrMaterial('default_box', { color: 0x4a5056, roughness: 0.5, metalness: 0.3 })
      );
      box.position.y = 0.4;
      root.add(box);
      break;
    }
  }

  // Soft Radial Contact Shadow Grounding Plane (Directive 3.2 - cached texture)
  const shadowGeo = new THREE.PlaneGeometry(3.5, 3.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: getRadialShadowTexture(),
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.005;
  root.add(shadowPlane);

  // Selection Ring Indicator
  if (isSelected) {
    const ringGeo = new THREE.RingGeometry(1.8, 1.95, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc59b27,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    root.add(ring);
  }

  // Relocated / Crisis Beacon Indicator
  if (isRelocated) {
    const beaconGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x16a34a });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.y = 2.2;
    root.add(beacon);
  }

  // Set position & rotation from item data
  root.position.set(item.position[0], item.position[1], item.position[2]);
  root.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
  root.scale.set(item.scale[0], item.scale[1], item.scale[2]);

  return root;
}
