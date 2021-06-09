import { vec3 } from 'gl-matrix';

import {
  Polytop,
  isInsideTriangle,
  getSilhouette,
  Silhouette,
  Face,
  Simplex,
  createPolytopFromSimplex,
  origin,
  SupportPoint,
  projectToTriangle,
  fromBarycentric
} from './math';
import { ShapeInterface, MinkowskiDifference } from './shape';

export const subdivide = (
  polytop: Polytop,
  shape: ShapeInterface<SupportPoint>
) => {
  const face = polytop.dequeue();

  if (!isInsideTriangle(face.closestBary)) {
    // never will be approached as closest. Put at the end of queue
    face.distance = Number.MAX_VALUE;
    polytop.enqueue(face);
    return;
  }

  const w = shape.support(
    {
      support0: vec3.create(),
      support1: vec3.create(),
      diff: vec3.create()
    },
    face.closest
  );

  face.obsolete = true;
  const silhouette: Silhouette = [];
  for (let i = 0; i < 3; i++) {
    getSilhouette(silhouette, face.siblings[i], face.adjacent[i], w.diff);
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
    const p2 = w;
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

  let face: Face = null;

  while (maxIterations-- > 0) {
    face = polytop.dequeue();

    if (!isInsideTriangle(face.closestBary)) {
      // never will be approached as closest. Put at the end of queue
      face.distance = Number.MAX_VALUE;
      polytop.enqueue(face);
      return;
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
    const silhouette: Silhouette = [];
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

  return face ? vec3.length(face.closest) : -1;
};
