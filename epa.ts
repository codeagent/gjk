import { quat, vec3 } from 'gl-matrix';

import { gjk } from './gjk';
import { PriorityQueue } from './priority-queue';
import { MinkowskiDifference, ShapeInterface } from './shape';

export namespace epa {
  const closestPointOnPlane = (
    out: vec3,
    p0: vec3,
    p1: vec3,
    p2: vec3,
    w: vec3
  ) => {
    const a = vec3.create();
    vec3.subtract(a, p1, p0);
    vec3.subtract(out, p2, p0);
    vec3.cross(out, a, out);
    vec3.sub(a, w, p0);
    vec3.scaleAndAdd(out, w, out, -vec3.dot(out, a) / vec3.dot(out, out));
  };

  const isInsideTriangle = (
    p0: vec3,
    p1: vec3,
    p2: vec3,
    n: vec3,
    w: vec3
  ): boolean => {
    const a = vec3.create();
    const b = vec3.create();

    vec3.sub(a, p1, p0);
    vec3.sub(b, w, p0);
    vec3.cross(a, a, b);
    if (vec3.dot(n, a) < 0) {
      return false;
    }

    vec3.sub(a, p2, p1);
    vec3.sub(b, w, p1);
    vec3.cross(a, a, b);
    if (vec3.dot(n, a) < 0) {
      return false;
    }

    vec3.sub(a, p0, p2);
    vec3.sub(b, w, p2);
    vec3.cross(a, a, b);
    if (vec3.dot(n, a) < 0) {
      return false;
    }

    return true;
  };

  type Silhouette = Array<[Face<vec3>, number]>;

  const getSilhouette = (
    out: Silhouette,
    face: Face<vec3>,
    i: number,
    support: vec3
  ) => {
    if (face.obsolete) {
      return;
    }

    if (
      vec3.dot(face.closest, support) < vec3.dot(face.closest, face.closest)
    ) {
      // not visible from support point, add to silhouette
      out.push([face, i]);
    } else {
      face.obsolete = true;

      getSilhouette(
        out,
        face.siblings[(i + 1) % 3],
        face.adjacent[(i + 1) % 3],
        support
      );
      getSilhouette(
        out,
        face.siblings[(i + 2) % 3],
        face.adjacent[(i + 2) % 3],
        support
      );
    }
  };

  export interface Face<T extends object> {
    vertices: T[];
    siblings: [Face<T>, Face<T>, Face<T>]; // edgeIndex -> face
    adjacent: [number, number, number]; // siblings[i].siblings[adjacent[i]] == this
    closest: vec3;
    distance: number;
    obsolete: boolean;
  }

  export type Polytop<T extends object = vec3> = PriorityQueue<Face<T>>;

  export const createPolytopFromSimplex = (
    simplex: gjk.Simplex<vec3>,
    shape: ShapeInterface
  ): Polytop => {
    if (simplex.size == 4) {
      const [w0, w1, w2, w3] = Array.from(simplex);
      return createTetrahedron(w0, w1, w2, w3);
    } else if (simplex.size === 3) {
      const [w0, w1, w2] = Array.from(simplex);
      return createHexahedronFromTriangle(w0, w1, w2, shape);
    } else if (simplex.size === 2) {
      const [w0, w1] = Array.from(simplex);
      return createHexahedronFromLineSegment(w0, w1, shape);
    } else {
      return null;
    }
  };

  export const createTetrahedron = (
    w0: vec3,
    w1: vec3,
    w2: vec3,
    w3: vec3
  ): Polytop => {
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
      obsolete: false
    };

    const face1: Face<vec3> = {
      vertices: [w1, w2, w3],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face2: Face<vec3> = {
      vertices: [w2, w0, w3],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face3: Face<vec3> = {
      vertices: [w1, w0, w2],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
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
      (a: Face<vec3>, b: Face<vec3>) => a.distance - b.distance
    );

    const O = vec3.create();
    for (let face of [face0, face1, face2, face3]) {
      closestPointOnPlane(
        face.closest,
        face.vertices[0],
        face.vertices[1],
        face.vertices[2],
        O
      );

      face.distance = vec3.dot(face.closest, face.closest);

      queue.enqueue(face);
    }

    return queue;
  };

  export const createHexahedronFromTriangle = (
    w0: vec3,
    w1: vec3,
    w2: vec3,
    shape: ShapeInterface
  ): Polytop => {
    const n = vec3.create();
    const w3 = vec3.create();
    const w4 = vec3.create();

    vec3.subtract(w3, w1, w0);
    vec3.subtract(w4, w2, w0);
    vec3.cross(n, w3, w4);

    shape.support(w3, n);
    vec3.negate(n, n);
    shape.support(w4, n);

    const face0: Face<vec3> = {
      vertices: [w0, w1, w3],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face1: Face<vec3> = {
      vertices: [w1, w2, w3],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face2: Face<vec3> = {
      vertices: [w2, w0, w3],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face3: Face<vec3> = {
      vertices: [w0, w4, w1],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face4: Face<vec3> = {
      vertices: [w1, w4, w2],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face5: Face<vec3> = {
      vertices: [w2, w4, w0],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    face0.siblings = [face3, face1, face2];
    face1.siblings = [face4, face2, face0];
    face2.siblings = [face5, face0, face1];
    face3.siblings = [face5, face4, face0];
    face4.siblings = [face3, face5, face1];
    face5.siblings = [face4, face3, face2];

    face0.adjacent = [2, 2, 1];
    face1.adjacent = [2, 2, 1];
    face2.adjacent = [2, 2, 1];
    face3.adjacent = [1, 0, 0];
    face4.adjacent = [1, 0, 0];
    face5.adjacent = [1, 0, 0];

    const queue = new PriorityQueue<Face<vec3>>(
      (a: Face<vec3>, b: Face<vec3>) => a.distance - b.distance
    );

    const O = vec3.create();
    for (let face of [face0, face1, face2, face3, face4, face5]) {
      closestPointOnPlane(
        face.closest,
        face.vertices[0],
        face.vertices[1],
        face.vertices[2],
        O
      );
      face.distance = vec3.dot(face.closest, face.closest);
      queue.enqueue(face);
    }

    return queue;
  };

  export const createHexahedronFromLineSegment = (
    w3: vec3,
    w4: vec3,
    shape: ShapeInterface
  ): Polytop => {
    const w3w4 = vec3.create();
    vec3.subtract(w3w4, w3, w4);

    // find convenient axis
    let min = w3w4[0];
    let axis = vec3.fromValues(1.0, 0.0, 0.0);
    if (w3w4[1] < min) {
      min = w3w4[1];
      vec3.set(axis, 0.0, 1.0, 0.0);
    }
    if (w3w4[2] < min) {
      vec3.set(axis, 0.0, 0.0, 1.0);
    }

    // find w0 by cross product
    const w0 = vec3.create();
    vec3.cross(w0, w3w4, axis);
    shape.support(w0, w0);

    const angle = Math.PI / 3.0;
    vec3.scale(w3w4, w3w4, Math.sin(angle) / vec3.length(w3w4));
    const q = quat.fromValues(w3w4[0], w3w4[1], w3w4[2], Math.cos(angle));

    // find w1 and w2 by repeatedly rotation at 120 degrees
    const w1 = vec3.create();
    vec3.transformQuat(w1, w0, q);
    shape.support(w1, w1);

    const w2 = vec3.create();
    vec3.transformQuat(w2, w1, q);
    shape.support(w2, w2);

    const face0: Face<vec3> = {
      vertices: [w0, w1, w3],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face1: Face<vec3> = {
      vertices: [w1, w2, w3],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face2: Face<vec3> = {
      vertices: [w2, w0, w3],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face3: Face<vec3> = {
      vertices: [w0, w4, w1],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face4: Face<vec3> = {
      vertices: [w1, w4, w2],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    const face5: Face<vec3> = {
      vertices: [w2, w4, w0],
      siblings: null,
      adjacent: null,
      distance: 0.0,
      closest: vec3.create(),
      obsolete: false
    };

    face0.siblings = [face3, face1, face2];
    face1.siblings = [face4, face2, face0];
    face2.siblings = [face5, face0, face1];
    face3.siblings = [face5, face4, face0];
    face4.siblings = [face3, face5, face1];
    face5.siblings = [face4, face3, face2];

    face0.adjacent = [2, 2, 1];
    face1.adjacent = [2, 2, 1];
    face2.adjacent = [2, 2, 1];
    face3.adjacent = [1, 0, 0];
    face4.adjacent = [1, 0, 0];
    face5.adjacent = [1, 0, 0];

    const queue = new PriorityQueue<Face<vec3>>(
      (a: Face<vec3>, b: Face<vec3>) => a.distance - b.distance
    );

    const O = vec3.create();
    for (let face of [face0, face1, face2, face3, face4, face5]) {
      closestPointOnPlane(
        face.closest,
        face.vertices[0],
        face.vertices[1],
        face.vertices[2],
        O
      );
      face.distance = vec3.dot(face.closest, face.closest);
      queue.enqueue(face);
    }

    return queue;
  };

  export const checkAdjacency = (polytop: Polytop) => {
    for (let face of Array.from(polytop)) {
      for (let i = 0; i < 3; i++) {
        const that = face.siblings[i].siblings[face.adjacent[i]];
        if (that !== face) {
          console.log(i, face, that);
        }
      }
    }
  };

  export const subdivide = (polytop: Polytop, shape: gjk.ShapeInterface) => {
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

    const O = vec3.create();

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
        O
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

  // export class MinkowskiDifference {
  //   private opposite = vec3.create();

  //   constructor(
  //     public readonly shape0: gjk.ShapeInterface,
  //     public readonly shape1: gjk.ShapeInterface
  //   ) {}

  //   support(dir: vec3): gjk.SupportPoint {
  //     vec3.negate(this.opposite, dir);

  //     const support0 = vec3.create();
  //     const support1 = vec3.create();
  //     const diff = vec3.create();

  //     this.shape0.support(support0, dir);
  //     this.shape1.support(support1, this.opposite);
  //     vec3.subtract(diff, support0, support1);

  //     return { support0, support1, diff };
  //   }
  // }

  export const penetrationDepth = (
    shape0: gjk.ShapeInterface,
    shape1: gjk.ShapeInterface,
    simplex: gjk.Simplex<vec3>,
    maxIterations = 25,
    epsilon = 1.0e-3
  ): number => {
    const minkowski = new MinkowskiDifference(shape0, shape1);
    const polytop = createPolytopFromSimplex(simplex, minkowski);

    if (!polytop) {
      return 0.0;
    }

    let face: Face<vec3> = null;

    while (maxIterations-- > 0) {
      face = polytop.dequeue();

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
        continue;
      }

      const support = vec3.create();
      minkowski.support(support, face.closest);
      const lower = Math.sqrt(vec3.dot(face.closest, face.closest));
      const upper = vec3.dot(face.closest, support) / lower;

      if (upper - lower < epsilon) {
        break;
      }

      face.obsolete = true;
      const silhouette: Silhouette = [];
      for (let i = 0; i < 3; i++) {
        getSilhouette(silhouette, face.siblings[i], face.adjacent[i], support);
      }

      // in real epa algorithm use obsolete flag to completly ignore the face
      for (let f of Array.from(polytop)) {
        if (f.obsolete) {
          polytop.remove(f);
        }
      }

      const O = vec3.create();
      let last: Face<vec3> = null;
      let first: Face<vec3> = null;

      for (let [face, i] of silhouette) {
        const p0 = face.vertices[(i + 1) % 3];
        const p1 = face.vertices[i];
        const p2 = support;
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
}
