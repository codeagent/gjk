import { vec3 } from 'gl-matrix';
import {
  Polytop,
  isInsideTriangle,
  getSilhouette,
  Silhouette,
  Face,
  Simplex,
  closestPointOnPlane,
  createPolytopFromSimplex,
  origin,
  SupportPoint
} from './math';
import { ShapeInterface, MinkowskiDifference } from './shape';

export const subdivide = (polytop: Polytop, shape: ShapeInterface) => {
  const face = polytop.dequeue();

  if (
    !isInsideTriangle(
      face.vertices[0],
      face.vertices[1],
      face.vertices[2],
      face.closest,
      face.closest
    )
  ) {
    // never will be approached as closest. Put at the end of queue
    face.distance = Number.MAX_VALUE;
    polytop.enqueue(face);
    return;
  }

  const w = vec3.create();
  shape.support(w, face.closest);

  face.obsolete = true;
  const silhouette: Silhouette = [];
  for (let i = 0; i < 3; i++) {
    getSilhouette(silhouette, face.siblings[i], face.adjacent[i], w);
  }

  // in real epa algorithm use obsolete flag to completly ignore the face
  for (let f of Array.from(polytop)) {
    if (f.obsolete) {
      polytop.remove(f);
    }
  }

  let last: Face<vec3> = null;
  let first: Face<vec3> = null;

  for (let [face, i] of silhouette) {
    const p0 = face.vertices[(i + 1) % 3];
    const p1 = face.vertices[i];
    const p2 = w;
    const curr: Face<vec3> = {
      vertices: [p0, p1, p2],
      siblings: [face, null, last],
      adjacent: [i, 2, 1],
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    closestPointOnPlane(
      curr.closest,
      curr.vertices[0],
      curr.vertices[1],
      curr.vertices[2],
      origin
    );

    curr.distance = vec3.dot(curr.closest, curr.closest);

    face.siblings[i] = curr;
    face.adjacent[i] = 0; // !it took me long time to realize the problem.

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
};

export const contactPoints = (
  out: [vec3, vec3],
  shape0: ShapeInterface,
  shape1: ShapeInterface,
  simplex: Simplex<SupportPoint>,
  maxIterations = 25,
  epsilon = 1.0e-3
): number => {
  const minkowski = new MinkowskiDifference(shape0, shape1);
  const polytop = createPolytopFromSimplex(simplex, minkowski);

  if (!polytop) {
    return 0.0;
  }

  let face: Face<SupportPoint> = null;

  while (maxIterations-- > 0) {
    face = polytop.dequeue();

    if (
      !isInsideTriangle(
        face.vertices[0].diff,
        face.vertices[1].diff,
        face.vertices[2].diff,
        face.closest,
        face.closest
      )
    ) {
      // never will be approached as closest. Put at the end of queue
      face.distance = Number.MAX_VALUE;
      polytop.enqueue(face);
      continue;
    }

    const support = minkowski.support(
      {
        support0: vec3.create(),
        support1: vec3.create(),
        diff: vec3.create()
      },
      face.closest
    );

    const lower = Math.sqrt(vec3.dot(face.closest, face.closest));
    const upper = vec3.dot(face.closest, support.diff) / lower;

    if (upper - lower < epsilon) {
      break;
    }

    face.obsolete = true;
    const silhouette: Silhouette<SupportPoint> = [];
    for (let i = 0; i < 3; i++) {
      getSilhouette(
        silhouette,
        face.siblings[i],
        face.adjacent[i],
        support.diff
      );
    }

    // in real epa algorithm use obsolete flag to completly ignore the face
    for (let f of Array.from(polytop)) {
      if (f.obsolete) {
        polytop.remove(f);
      }
    }

    const O = vec3.create();
    let last: Face<SupportPoint> = null;
    let first: Face<SupportPoint> = null;

    for (let [face, i] of silhouette) {
      const p0 = face.vertices[(i + 1) % 3];
      const p1 = face.vertices[i];
      const p2 = support;
      const curr: Face<SupportPoint> = {
        vertices: [p0, p1, p2],
        siblings: [face, null, last],
        adjacent: [i, 2, 1],
        distance: 0.0,
        closest: vec3.create(),
        obsolete: false
      };

      closestPointOnPlane(
        curr.closest,
        curr.vertices[0].diff,
        curr.vertices[1].diff,
        curr.vertices[2].diff,
        O
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

  return face ? vec3.length(face.closest) : -1;
};
