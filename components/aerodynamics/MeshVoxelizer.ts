import * as THREE from 'three';

/**
 * Voxelizes/rasterizes 3D geometries onto the 2D/3D CFD lattice grid.
 */
export class MeshVoxelizer {
  /**
   * Generates a 2D binary obstacle mask (nx * ny) for canonical and preset shapes
   */
  public static generatePresetMask(
    presetId: string,
    nx: number,
    ny: number,
    angleDeg: number,
    drsOpen = false
  ): Uint8Array {
    const mask = new Uint8Array(nx * ny);
    const rad = (angleDeg * Math.PI) / 180.0;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    // Center of obstacle in grid coordinates (45% into tunnel)
    const cx = Math.floor(nx * 0.45);
    const cy = Math.floor(ny * 0.50);

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const idx = y * nx + x;
        // Coordinates relative to obstacle center
        const dx = x - cx;
        const dy = y - cy;

        // Rotate by -AoA to align with local obstacle axes
        const rx = dx * cosA + dy * sinA;
        const ry = -dx * sinA + dy * cosA;

        let isSolid = false;

        switch (presetId) {
          case 'sphere': {
            // Circular cross-section in flow slice
            const radius = ny * 0.16;
            if (dx * dx + dy * dy <= radius * radius) {
              isSolid = true;
            }
            break;
          }

          case 'golf-ball': {
            // Dimpled sphere cross section showing surface tripping indentations
            const baseR = ny * 0.16;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            // 20 dimples around perimeter
            const dimpleDepth = baseR * 0.055 * Math.pow(Math.cos(10 * angle), 4);
            const dimpledR = baseR - dimpleDepth;
            if (dist <= dimpledR) {
              isSolid = true;
            }
            break;
          }

          case 'flat-plate': {
            // Thin plate perpendicular to chord
            const halfLength = ny * 0.26;
            const halfThickness = Math.max(1, ny * 0.015);
            if (Math.abs(ry) <= halfLength && Math.abs(rx) <= halfThickness) {
              isSolid = true;
            }
            break;
          }

          case 'cylinder': {
            // Circular cylinder cross section
            const r = ny * 0.14;
            if (dx * dx + dy * dy <= r * r) {
              isSolid = true;
            }
            break;
          }

          case 'naca0012':
          case 'naca4412': {
            const chord = nx * 0.30;
            const t = 0.12;
            const xNorm = (rx + chord * 0.5) / chord;

            if (xNorm >= 0.0 && xNorm <= 1.0) {
              const yt =
                5 *
                t *
                chord *
                (0.2969 * Math.sqrt(xNorm) -
                  0.126 * xNorm -
                  0.3516 * xNorm * xNorm +
                  0.2843 * Math.pow(xNorm, 3) -
                  0.1015 * Math.pow(xNorm, 4));

              let camber = 0;
              if (presetId === 'naca4412') {
                const m = 0.04;
                const p = 0.4;
                if (xNorm < p) {
                  camber = (m / (p * p)) * (2 * p * xNorm - xNorm * xNorm) * chord;
                } else {
                  camber = (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * xNorm - xNorm * xNorm) * chord;
                }
              }

              if (Math.abs(ry - camber) <= yt) {
                isSolid = true;
              }
            }
            break;
          }

          case 'f1-rear-wing': {
            // Dual-element F1 Rear Wing cross-section with toggleable DRS flap
            // 1. Mainplane (heavily cambered lower wing element generating base downforce)
            const mainChord = nx * 0.20;
            const mainXNorm = (rx + mainChord * 0.5 + 4) / mainChord;
            if (mainXNorm >= 0.0 && mainXNorm <= 1.0) {
              // High-camber concave underside (producing upward camber / downward lift)
              const mainCamber = -ny * 0.06 * Math.sin(Math.PI * mainXNorm);
              const mainThick = ny * 0.035 * (1 - Math.abs(mainXNorm - 0.3) * 1.2);
              if (Math.abs(ry - mainCamber) <= Math.max(1, mainThick)) {
                isSolid = true;
              }
            }

            // 2. Upper DRS Flap
            const flapChord = nx * 0.13;
            if (!drsOpen) {
              // DRS CLOSED: High angle flap (steep inclination, tight slot gap)
              const flapPivotX = 6;
              const flapPivotY = ny * 0.04;
              const flapAngle = 0.55; // ~32 degrees
              const cosF = Math.cos(flapAngle);
              const sinF = Math.sin(flapAngle);
              const ldx = rx - flapPivotX;
              const ldy = ry - flapPivotY;
              const fx = ldx * cosF + ldy * sinF;
              const fy = -ldx * sinF + ldy * cosF;
              if (fx >= 0 && fx <= flapChord && Math.abs(fy) <= ny * 0.025) {
                isSolid = true;
              }
            } else {
              // DRS OPEN: Flap articulated flat/horizontal, creating a wide 85mm slot gap!
              const flapStartX = 8;
              const flapStartY = ny * 0.11; // lifted high above mainplane
              const fx = rx - flapStartX;
              const fy = ry - flapStartY;
              if (fx >= 0 && fx <= flapChord && Math.abs(fy) <= ny * 0.018) {
                isSolid = true;
              }
            }
            break;
          }

          case 'jet-airliner': {
            // Commercial Jet: Fuselage + Wing + Underslung Engine Nacelle + Vertical Stabilizer
            const fuseHalfL = nx * 0.24;
            const fuseH = ny * 0.07;
            // Fuselage capsule
            if (Math.abs(rx) <= fuseHalfL && Math.abs(ry) <= fuseH) {
              isSolid = true;
            }
            // Wing profile at root
            const wingChord = nx * 0.15;
            const wx = rx + nx * 0.02;
            if (wx >= 0 && wx <= wingChord && Math.abs(ry + ny * 0.02) <= ny * 0.025) {
              isSolid = true;
            }
            // Engine nacelle pod below wing
            const nacelleL = nx * 0.09;
            const nxPos = rx + nx * 0.04;
            if (nxPos >= 0 && nxPos <= nacelleL && Math.abs(ry + ny * 0.10) <= ny * 0.035) {
              isSolid = true;
            }
            // Vertical fin at rear
            const finBaseX = rx - nx * 0.14;
            if (finBaseX >= 0 && finBaseX <= nx * 0.08 && ry >= fuseH && ry <= ny * 0.20) {
              isSolid = true;
            }
            break;
          }

          case 'supersonic-jet': {
            // Supersonic Fighter: Needle nose, slender ogive body, razor-thin delta wing, twin vertical tails
            const noseLen = nx * 0.28;
            if (rx >= -noseLen && rx <= nx * 0.24) {
              const bodyTaper = rx < 0 ? (rx + noseLen) / noseLen : 1.0 - (rx / (nx * 0.32));
              const halfH = Math.max(1.5, ny * 0.05 * Math.max(0.2, bodyTaper));
              if (Math.abs(ry) <= halfH) {
                isSolid = true;
              }
            }
            // Thin delta wing section
            const deltaStart = -nx * 0.06;
            const deltaLen = nx * 0.22;
            if (rx >= deltaStart && rx <= deltaStart + deltaLen && Math.abs(ry) <= ny * 0.015) {
              isSolid = true;
            }
            // Twin canted vertical tail fins
            if (rx >= nx * 0.10 && rx <= nx * 0.20 && ry >= ny * 0.03 && ry <= ny * 0.16) {
              isSolid = true;
            }
            break;
          }

          case 'propeller-blade': {
            // High efficiency twisted aerofoil cross section
            const chord = nx * 0.24;
            const xNorm = (rx + chord * 0.45) / chord;
            if (xNorm >= 0 && xNorm <= 1) {
              const camber = ny * 0.04 * Math.sin(Math.PI * xNorm);
              const thick = ny * 0.03 * Math.sin(Math.PI * xNorm);
              if (Math.abs(ry - camber) <= thick) {
                isSolid = true;
              }
            }
            break;
          }

          case 'car-body': {
            // Fastback sedan aerodynamic silhouette
            const L = nx * 0.32;
            const H = ny * 0.16;
            const normX = rx / (L * 0.5); // [-1, 1]
            const normY = ry / H;         // [-1, 1]

            if (normX >= -1.0 && normX <= 1.0 && normY >= -0.7 && normY <= 0.8) {
              // Roof curved contour
              const roofLimit = 0.8 * (1.0 - Math.pow(normX * 0.9, 4));
              if (normY <= roofLimit) {
                isSolid = true;
              }
            }
            break;
          }

          case 'finite-wing':
          default: {
            // General streamlined teardrop profile
            const chord = nx * 0.26;
            const xNorm = (rx + chord * 0.4) / chord;
            if (xNorm >= 0 && xNorm <= 1) {
              const halfThick = ny * 0.08 * Math.sin(Math.PI * xNorm);
              if (Math.abs(ry) <= halfThick) {
                isSolid = true;
              }
            }
            break;
          }
        }

        mask[idx] = isSolid ? 1 : 0;
      }
    }

    return mask;
  }

  /**
   * Voxelizes a generic Three.js mesh/scene into the 2D CFD obstacle mask
   */
  public static voxelizeMesh(
    mesh: THREE.Object3D,
    nx: number,
    ny: number,
    angleDeg: number
  ): Uint8Array {
    const mask = new Uint8Array(nx * ny);

    // Compute bounding box
    const bbox = new THREE.Box3().setFromObject(mesh);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    const cx = Math.floor(nx * 0.45);
    const cy = Math.floor(ny * 0.50);

    const rad = (angleDeg * Math.PI) / 180.0;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);

    // Scale mesh extent to fit neatly in tunnel height
    const targetHeightInCells = ny * 0.35;
    const scaleFactor = size.y > 0 ? targetHeightInCells / size.y : 1;
    const halfWidthCells = (size.x * scaleFactor) * 0.5;
    const halfHeightCells = (size.y * scaleFactor) * 0.5;

    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const dx = x - cx;
        const dy = y - cy;

        // Rotate
        const rx = dx * cosA + dy * sinA;
        const ry = -dx * sinA + dy * cosA;

        // Ellipsoidal bounding envelope fallback
        const normDist = Math.pow(rx / Math.max(1, halfWidthCells), 2) + Math.pow(ry / Math.max(1, halfHeightCells), 2);
        if (normDist <= 1.0) {
          mask[y * nx + x] = 1;
        }
      }
    }

    return mask;
  }
}
