import { vec3 } from 'gl-matrix';

import {
  isInsideTriangle,
  getSilhouette,
  Silhouette,
  Face,
  Simplex,
  origin,
  SupportPoint,
  projectToTriangle,
  fromBarycentric,
  createTetrahedron,
  createHexahedronFromTriangle,
  createHexahedronFromLineSegment
} from './math';
import { ShapeInterface, MinkowskiDifference } from './shape';

export const contactPoints = (
  out: [vec3, vec3],
  shape0: ShapeInterface,
  shape1: ShapeInterface,
  simplex: Simplex<SupportPoint>,
  epsilon = 1.0e-3,
  maxIterations = 25
): number => {
  epsilon = epsilon * epsilon;

  // early out
  for (const w of simplex.values()) {
    if (vec3.dot(w.diff, w.diff) < epsilon) {
      vec3.set(out[0], 0.0, 0.0, 0.0);
      vec3.set(out[1], 0.0, 0.0, 0.0);
      return 0.0;
    }
  }

  const minkowski = new MinkowskiDifference(shape0, shape1);
  let polytop = null;

  if (simplex.size == 4) {
    const [w0, w1, w2, w3] = Array.from(simplex);
    polytop = createTetrahedron(w0, w1, w2, w3);
  } else if (simplex.size === 3) {
    const [w0, w1, w2] = Array.from(simplex);
    polytop = createHexahedronFromTriangle(w0, w1, w2, minkowski);
  } else if (simplex.size === 2) {
    const [w0, w1] = Array.from(simplex);
    polytop = createHexahedronFromLineSegment(w0, w1, minkowski);
  } else {
    // point should be origin itself.
    vec3.set(out[0], 0.0, 0.0, 0.0);
    vec3.set(out[1], 0.0, 0.0, 0.0);
    return 0.0;
  }

  let face: Face = null;
  let support: SupportPoint;
  while (--maxIterations > 0 && polytop.length) {
    face = polytop.dequeue();

    if (!isInsideTriangle(face.closestBary)) {
      // never will be approached as closest. Put at the end of queue
      face.distance = Number.MAX_VALUE;
      polytop.enqueue(face);
      continue;
    }

    support = minkowski.support(
      {
        support0: vec3.create(),
        support1: vec3.create(),
        diff: vec3.create()
      },
      face.closest
    );

    const lower = vec3.dot(face.closest, face.closest);
    const upper = vec3.dot(face.closest, support.diff);

    if (upper - lower < epsilon) {
      break;
    }

    face.obsolete = true;
    const silhouette: Silhouette = [];
    for (let i = 0; i < 3; i++) {
      getSilhouette(
        silhouette,
        face.siblings[i],
        face.adjacent[i],
        support.diff,
        epsilon
      );
    }

    if (!silhouette.length) {
      vec3.set(out[0], 0.0, 0.0, 0.0);
      vec3.set(out[1], 0.0, 0.0, 0.0);
      return 0.0;
    }

    // in real epa algorithm use obsolete flag to completly ignore the face
    for (let f of Array.from(polytop)) {
      if (f.obsolete) {
        polytop.remove(f);
      }
    }

    let last: Face = null;
    let first: Face = null;

    for (let [face, i] of silhouette) {
      const p0 = face.vertices[(i + 1) % 3];
      const p1 = face.vertices[i];
      const p2 = support;
      const curr: Face = {
        vertices: [p0, p1, p2],
        siblings: [face, null, last],
        adjacent: [i, 2, 1],
        distance: 0.0,
        closest: vec3.create(),
        closestBary: vec3.create(),
        obsolete: false
      };

      projectToTriangle(
        curr.closestBary,
        curr.vertices[0].diff,
        curr.vertices[1].diff,
        curr.vertices[2].diff,
        origin
      );
      fromBarycentric(
        curr.closest,
        curr.closestBary,
        curr.vertices[0].diff,
        curr.vertices[1].diff,
        curr.vertices[2].diff
      );

      curr.distance = vec3.dot(curr.closest, curr.closest);
      face.siblings[i] = curr;
      face.adjacent[i] = 0;

      polytop.enqueue(curr);

      if (last) {
        last.siblings[1] = curr;
      } else {
        first = curr;
      }
      last = curr;
    }

    first.siblings[2] = last;
    last.siblings[1] = first;
  }

  if (face) {
    fromBarycentric(
      out[0],
      face.closestBary,
      face.vertices[0].support0,
      face.vertices[1].support0,
      face.vertices[2].support0
    );

    fromBarycentric(
      out[1],
      face.closestBary,
      face.vertices[0].support1,
      face.vertices[1].support1,
      face.vertices[2].support1
    );

    return vec3.distance(out[0], out[1]);
  } else {
    vec3.set(out[0], 0.0, 0.0, 0.0);
    vec3.set(out[1], 0.0, 0.0, 0.0);
    return 0.0;
  }
};
