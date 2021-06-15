import { vec3 } from 'gl-matrix';

import {
  Face,
  fromBarycentric,
  getSilhouette,
  origin,
  Polytop,
  projectToTriangle,
  Silhouette
} from './math';
import { PriorityQueue } from './priority-queue';

const createTetrahedron = (
  w0: vec3,
  w1: vec3,
  w2: vec3,
  w3: vec3
): Polytop<vec3> => {
  const w1w0 = vec3.create();
  const w2w0 = vec3.create();

  vec3.subtract(w1w0, w1, w0);
  vec3.subtract(w2w0, w2, w0);

  const x = vec3.create();
  vec3.cross(x, w2w0, w1w0);

  const w3w0 = vec3.create();
  vec3.subtract(w3w0, w3, w0);

  // preserve ccw orientation: swap w1 and w2
  if (vec3.dot(w3w0, x) > 0.0) {
    const tmp = w2;
    w2 = w1;
    w1 = tmp;
  }

  const face0: Face<vec3> = {
    vertices: [w0, w1, w3],
    siblings: null,
    adjacent: null,
    distance: 0.0,
    closest: vec3.create(),
    closestBary: vec3.create(),
    obsolete: false
  };

  const face1: Face<vec3> = {
    vertices: [w1, w2, w3],
    siblings: null,
    adjacent: null,
    distance: 0.0,
    closest: vec3.create(),
    closestBary: vec3.create(),
    obsolete: false
  };

  const face2: Face<vec3> = {
    vertices: [w2, w0, w3],
    siblings: null,
    adjacent: null,
    distance: 0.0,
    closest: vec3.create(),
    closestBary: vec3.create(),
    obsolete: false
  };

  const face3: Face<vec3> = {
    vertices: [w1, w0, w2],
    siblings: null,
    adjacent: null,
    distance: 0.0,
    closest: vec3.create(),
    closestBary: vec3.create(),
    obsolete: false
  };

  face0.siblings = [face3, face1, face2];
  face1.siblings = [face3, face2, face0];
  face2.siblings = [face3, face0, face1];
  face3.siblings = [face0, face2, face1];

  face0.adjacent = [0, 2, 1];
  face1.adjacent = [2, 2, 1];
  face2.adjacent = [1, 2, 1];
  face3.adjacent = [0, 0, 0];

  const queue = new PriorityQueue<Face<vec3>>(
    (a: Face<vec3>, b: Face<vec3>) => -1
  );

  for (let face of [face0, face1, face2, face3]) {
    projectToTriangle(
      face.closestBary,
      face.vertices[0],
      face.vertices[1],
      face.vertices[2],
      origin
    );
    fromBarycentric(
      face.closest,
      face.closestBary,
      face.vertices[0],
      face.vertices[1],
      face.vertices[2]
    );
    queue.enqueue(face);
  }

  return queue;
};

const createInitialPolytop = (cloud: vec3[]): Polytop<vec3> => {
  let minX = cloud[0];
  let maxX = cloud[0];
  let maxXDot = Number.MIN_VALUE;
  let minXDot = Number.MAX_VALUE;
  const X = vec3.fromValues(1.0, 0.0, 0.0);

  for (const p of cloud) {
    const dotX = vec3.dot(X, p);

    if (dotX > maxXDot) {
      maxXDot = dotX;
      maxX = p;
    }

    if (-dotX < minXDot) {
      minXDot = dotX;
      minX = p;
    }
  }

  const w0 = minX;
  const w1 = maxX;
  const w0w1 = vec3.create();
  vec3.subtract(w0w1, w1, w0);
  vec3.normalize(w0w1, w0w1);

  // find w2
  const x = vec3.create();
  const y = vec3.create();
  let max = 0;
  let w2: vec3 = null;
  for (let p of cloud) {
    vec3.subtract(x, p, w0);
    vec3.scaleAndAdd(y, w0, w0w1, vec3.dot(x, w0w1));
    vec3.subtract(y, p, y);
    const d = vec3.length(y);
    if (max < d) {
      max = d;
      w2 = p;
    }
  }

  // find w3
  vec3.subtract(y, w2, w0);
  vec3.cross(x, w0w1, y);
  vec3.normalize(x, x);
  max = 0;
  let w3: vec3 = null;
  for (let p of cloud) {
    vec3.subtract(y, p, w0);
    vec3.scale(y, x, vec3.dot(x, y));
    const d = vec3.length(y);
    if (max < d) {
      max = d;
      w3 = p;
    }
  }

  return createTetrahedron(w0, w1, w2, w3);
};

const findFarthest = (face: Face<vec3>, cloud: vec3[]): vec3 => {
  let max = 1.0e-3;
  let farthest: vec3 = null;
  const d = vec3.dot(face.closest, face.vertices[0]);
  for (let point of cloud) {
    const dist = vec3.dot(point, face.closest) - d;
    if (max < dist) {
      farthest = point;
      max = dist;
    }
  }
  return farthest;
};

const cutCloud = (face: Face<vec3>, cloud: vec3[], eps = 1.0e-3): vec3[] => {
  const points: vec3[] = [];
  const d = vec3.dot(face.closest, face.vertices[0]);
  for (let p of cloud) {
    if (vec3.dot(face.closest, p) - d > eps) {
      points.push(p);
    }
  }
  return points;
};

export const convexHull = (cloud: vec3[]): Polytop<vec3> => {
  const polytop = createInitialPolytop(cloud);
  // return polytop;
  const lookup = new Map<Face<vec3>, vec3[]>();

  for (let face of Array.from(polytop)) {
    const cut = cutCloud(face, cloud);
    if (cut.length) {
      lookup.set(face, cut);
    }
  }

  let m = 130;

  while (lookup.size && --m > 0) {
    // find farsest
    const face = polytop.dequeue();
    const points = lookup.get(face);
    const farthest = points ? findFarthest(face, points) : null;
    lookup.delete(face);

    
    if (!points) {
      polytop.enqueue(face);
      continue;
    }

    console.log(farthest)

    // fibd silhuette from farthest point
    face.obsolete = true;
    const silhouette: Silhouette<vec3> = [];
    for (let i = 0; i < 3; i++) {
      getSilhouette(silhouette, face.siblings[i], face.adjacent[i], farthest);
    }

    // remove obsolete
    for (let f of Array.from(polytop)) {
      if (f.obsolete) {
        polytop.remove(f);
        lookup.delete(f);
      }
    }

    // create cone
    let last: Face<vec3> = null;
    let first: Face<vec3> = null;

    for (let [face, i] of silhouette) {
      const p0 = face.vertices[(i + 1) % 3];
      const p1 = face.vertices[i];
      const p2 = farthest;
      const curr: Face<vec3> = {
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
        curr.vertices[0],
        curr.vertices[1],
        curr.vertices[2],
        origin
      );
      fromBarycentric(
        curr.closest,
        curr.closestBary,
        curr.vertices[0],
        curr.vertices[1],
        curr.vertices[2]
      );

      face.siblings[i] = curr;
      face.adjacent[i] = 0;

      polytop.enqueue(curr);
      const cut = cutCloud(curr, points);
      if (cut.length) {
        lookup.set(curr, cut);
      }

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

  return polytop;
};
