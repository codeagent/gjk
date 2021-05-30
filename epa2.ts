import { vec3 } from 'gl-matrix';

import { gjk } from './gjk';
import { PriorityQueue } from './priority-queue';

export namespace epa {
  export interface Face<T extends object> {
    vertices: T[];
    siblings: [Face<T>, Face<T>, Face<T>]; // edgeIndex -> face
    adjacent: [number, number, number]; // siblings[i].siblings[adjacent[i]] == this
    closest: vec3;
    distance: number;
    obsolete: boolean;
  }

  export type Polytop<T extends object = vec3> = PriorityQueue<Face<T>>;

  const closestPointToPlane = (
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
    vec3.scaleAndAdd(out, a, out, -vec3.dot(out, a) / vec3.dot(out, out));
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

  export const polytopFromSimplex = (simplex: gjk.Simplex<vec3>): Polytop => {
    const vertices = Array.from(simplex);

    let w0 = vertices[0];
    let w1 = vertices[1];
    let w2 = vertices[2];
    let w3 = vertices[3];
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
      closestPointToPlane(
        face.closest,
        face.vertices[0],
        face.vertices[1],
        face.vertices[2],
        O
      );

      // @todo: use squred length instead
      // face.distance = vec3.dot(face.closest, face.closest);
      face.distance = vec3.length(face.closest);
      queue.enqueue(face);
    }

    return queue;
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

  export const subdivide = (polytop: Polytop, shape: gjk.ShapeInterface) => {
    const face = polytop.dequeue();

    if (
      !isInsideTriangle(
        face.vertices[0],
        face.vertices[0],
        face.vertices[0],
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

    // @todo:
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

      closestPointToPlane(
        curr.closest,
        curr.vertices[0],
        curr.vertices[1],
        curr.vertices[2],
        O
      );

      // @todo: use squred length instead
      // face.distance = vec3.dot(face.closest, face.closest);
      curr.distance = vec3.length(curr.closest);

      polytop.enqueue(curr);

      if (last) {
        last.siblings[1] = curr;
      } else {
        first = curr;
      }
      last = curr;
    }

    first.siblings[2] = last;
  };
}
