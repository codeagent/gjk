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
  if (!face) {
    return;
  }

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
  epsilon = 1.0e-3,
  maxIterations = 25
): number => {
  const minkowski = new MinkowskiDifference(shape0, shape1);
  const polytop = createPolytopFromSimplex(simplex, minkowski);

  if (!polytop) {
    return 0.0;
  }

  for (let f of polytop) {
    if (isNaN(f.closest[0]) || isNaN(f.closest[1]) || isNaN(f.closest[2])) {
      // debugger;
    }
  }

  epsilon = epsilon * epsilon;

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
        support.diff
      );
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

    // out[0] = support.support0;
    // out[1] = support.support1;

    return vec3.distance(out[0], out[1]);
  } else {
    return 0.0;
  }
};
