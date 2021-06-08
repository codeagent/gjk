import { vec2, vec3, vec4 } from 'gl-matrix';

const aux = vec3.create();
const mixed = (a: vec3, b: vec3, c: vec3) => vec3.dot(a, vec3.cross(aux, b, c));

export interface SupportPoint {
  diff: vec3; // support0 - support1
  support0: vec3;
  support1: vec3;
}

export type Simplex<T> = Set<T>;

export const origin = vec3.create();

export const fromBarycentric = <T extends ArrayLike<number>>(
  out: vec3,
  barycentric: T,
  ...points: vec3[]
) => {
  vec3.set(out, 0.0, 0.0, 0.0);
  for (let i = 0; i < barycentric.length; i++) {
    vec3.scaleAndAdd(out, out, points[i], barycentric[i]);
  }
  return out;
};

export const closestPointToTetrahedron = (
  out: vec4,
  a: vec3,
  b: vec3,
  c: vec3,
  d: vec3,
  p: vec3
): vec4 => {
  // check voronoi region of a
  const ap = vec3.subtract(vec3.create(), p, a);
  const ab = vec3.subtract(vec3.create(), b, a);
  const ac = vec3.subtract(vec3.create(), c, a);
  const ad = vec3.subtract(vec3.create(), d, a);
  const apOab = vec3.dot(ap, ab);
  const apOac = vec3.dot(ap, ac);
  const apOad = vec3.dot(ap, ad);

  if (apOab <= 0 && apOac <= 0 && apOad <= 0) {
    return vec4.set(out, 1.0, 0.0, 0.0, 0.0);
  }

  // check voronoi region of b
  const bp = vec3.subtract(vec3.create(), p, b);
  const bc = vec3.subtract(vec3.create(), c, b);
  const bd = vec3.subtract(vec3.create(), d, b);
  const bpOba = -vec3.dot(bp, ab);
  const bpObc = vec3.dot(bp, bc);
  const bpObd = vec3.dot(bp, bd);

  if (bpOba <= 0 && bpObc <= 0 && bpObd <= 0) {
    return vec4.set(out, 0.0, 1.0, 0.0, 0.0);
  }

  // check voronoi region of c
  const cp = vec3.subtract(vec3.create(), p, c);
  const cd = vec3.subtract(vec3.create(), d, c);
  const cpOca = -vec3.dot(cp, ac);
  const cpOcb = -vec3.dot(cp, bc);
  const cpOcd = vec3.dot(cp, cd);

  if (cpOca <= 0 && cpOcb <= 0 && cpOcd <= 0) {
    return vec4.set(out, 0.0, 0.0, 1.0, 0.0);
  }

  // check voronoi region of d
  const dp = vec3.subtract(vec3.create(), p, d);
  const dpOda = -vec3.dot(dp, ad);
  const dpOdb = -vec3.dot(dp, bd);
  const dpOdc = -vec3.dot(dp, cd);

  if (dpOda <= 0 && dpOdb <= 0 && dpOdc <= 0) {
    return vec4.set(out, 0.0, 0.0, 0.0, 1.0);
  }

  // check voronoi region of ab edge
  const nAbc = vec3.cross(vec3.create(), ab, ac);
  const nAbd = vec3.cross(vec3.create(), ad, ab);
  const apOabXnAbc = mixed(ap, ab, nAbc);
  const apOnAbdXab = mixed(ap, nAbd, ab);
  if (apOab >= 0 && bpOba >= 0 && apOabXnAbc >= 0 && apOnAbdXab >= 0) {
    const t = apOab / vec3.dot(ab, ab);
    return vec4.set(out, 1.0 - t, t, 0.0, 0.0);
  }

  // check voronoi region of ac edge
  const nAcd = vec3.cross(vec3.create(), ac, ad);
  const apOnAbcXac = mixed(ap, nAbc, ac);
  const apOacXnAcd = mixed(ap, ac, nAcd);
  if (apOac >= 0 && cpOca >= 0 && apOnAbcXac >= 0 && apOacXnAcd >= 0) {
    const t = apOac / vec3.dot(ac, ac);
    return vec4.set(out, 1.0 - t, 0.0, t, 0.0);
  }

  // check voronoi region of ad edge
  const apOnAcdXad = mixed(ap, nAcd, ad);
  const apOadXnAbd = mixed(ap, ad, nAbd);
  if (apOad >= 0 && dpOda >= 0 && apOnAcdXad >= 0 && apOadXnAbd >= 0) {
    const t = apOad / vec3.dot(ad, ad);
    vec4.set(out, 1.0 - t, 0.0, 0.0, t);
    return;
  }

  // check voronoi region of bc edge
  const nBcd = vec3.cross(vec3.create(), bd, bc);
  const bpObcXnAbc = mixed(bp, bc, nAbc);
  const bpOnBcdXbc = mixed(bp, nBcd, bc);
  if (bpObc >= 0 && cpOcb >= 0 && bpObcXnAbc >= 0 && bpOnBcdXbc >= 0) {
    const t = bpObc / vec3.dot(bc, bc);
    return vec4.set(out, 0.0, 1.0 - t, t, 0.0);
  }

  // check voronoi region of cd edge
  const cpOcdXnAcd = mixed(cp, cd, nAcd);
  const cpOnBcdXcd = mixed(cp, nBcd, cd);
  if (cpOcd >= 0 && dpOdc >= 0 && cpOcdXnAcd >= 0 && cpOnBcdXcd >= 0) {
    const t = cpOcd / vec3.dot(cd, cd);
    return vec4.set(out, 0.0, 0.0, 1.0 - t, t);
  }

  // check voronoi region of bd edge
  const bpOnAbdXbd = mixed(bp, nAbd, bd);
  const bpObdXnBcd = mixed(bp, bd, nBcd);
  if (bpObd >= 0 && dpOdb >= 0 && bpOnAbdXbd >= 0 && bpObdXnBcd >= 0) {
    const t = bpObd / vec3.dot(bd, bd);
    return vec4.set(out, 0.0, 1.0 - t, 0.0, t);
  }

  // find closest point on abc
  if (
    vec3.dot(nAbc, ap) * vec3.dot(nAbc, ad) <= 0 &&
    apOabXnAbc <= 0 &&
    apOnAbcXac <= 0 &&
    bpObcXnAbc <= 0
  ) {
    let u = Math.abs(mixed(nAbc, bp, cp));
    let v = Math.abs(mixed(nAbc, cp, ap));
    let w = Math.abs(mixed(nAbc, ap, bp));
    let s = u + v + w;
    u /= s;
    v /= s;
    w /= s;
    return vec4.set(out, u, v, w, 0.0);
  }

  // find closest point on acd
  if (
    vec3.dot(nAcd, ap) * vec3.dot(nAcd, ab) <= 0.0 &&
    apOacXnAcd <= 0 &&
    apOnAcdXad <= 0 &&
    cpOcdXnAcd <= 0
  ) {
    let u = Math.abs(mixed(nAcd, cp, dp));
    let v = Math.abs(mixed(nAcd, dp, ap));
    let w = Math.abs(mixed(nAcd, ap, cp));
    let s = u + v + w;
    u /= s;
    v /= s;
    w /= s;
    return vec4.set(out, u, 0.0, v, w);
  }

  // find closest point on adb
  if (
    vec3.dot(nAbd, ap) * vec3.dot(nAbd, ac) <= 0.0 &&
    apOnAbdXab <= 0 &&
    apOadXnAbd <= 0 &&
    bpOnAbdXbd <= 0
  ) {
    let u = Math.abs(mixed(nAbd, dp, bp));
    let v = Math.abs(mixed(nAbd, bp, ap));
    let w = Math.abs(mixed(nAbd, ap, dp));
    let s = u + v + w;
    u /= s;
    v /= s;
    w /= s;
    return vec4.set(out, u, w, 0.0, v);
  }

  // find closest point on cbd
  if (
    vec3.dot(nBcd, cp) * vec3.dot(nBcd, ab) >= 0.0 &&
    bpOnBcdXbc <= 0 &&
    cpOnBcdXcd <= 0 &&
    bpObdXnBcd <= 0
  ) {
    let u = Math.abs(mixed(nBcd, bp, dp));
    let v = Math.abs(mixed(nBcd, dp, cp));
    let w = Math.abs(mixed(nBcd, cp, bp));
    let s = u + v + w;
    u /= s;
    v /= s;
    w /= s;
    return vec4.set(out, 0.0, v, u, w);
  }

  // we are in tetrahedron itself, return 'special' indication
  return vec4.set(out, -1.0, -1.0, -1.0, -1.0);
};

export const closestPointToTriangle = (
  out: vec3,
  a: vec3,
  b: vec3,
  c: vec3,
  p: vec3
): vec3 => {
  const ab = vec3.subtract(vec3.create(), b, a);
  const ac = vec3.subtract(vec3.create(), c, a);
  const bc = vec3.subtract(vec3.create(), c, b);
  const ap = vec3.subtract(vec3.create(), p, a);
  const bp = vec3.subtract(vec3.create(), p, b);
  const cp = vec3.subtract(vec3.create(), p, c);

  // Compute parametric position s for projection P’ of P on AB,
  // P’ = A + s*AB, s = snom/(snom+sdenom)
  const snom = vec3.dot(ap, ab);
  const sdenom = -vec3.dot(bp, ab);

  // Compute parametric position t for projection P’ of P on AC,
  // P’ = A + t*AC, s = tnom/(tnom+tdenom)
  const tnom = vec3.dot(ap, ac);
  const tdenom = -vec3.dot(cp, ac);
  if (snom <= 0.0 && tnom <= 0.0) {
    return vec3.set(out, 1.0, 0.0, 0.0); // Vertex region early out
  }
  // Compute parametric position u for projection P’ of P on BC,
  // P’ = B + u*BC, u = unom/(unom+udenom)
  const unom = vec3.dot(bp, bc);
  const udenom = -vec3.dot(cp, bc);
  if (sdenom <= 0.0 && unom <= 0.0) {
    return vec3.set(out, 0.0, 1.0, 0.0); // Vertex region early out
  }
  if (tdenom <= 0.0 && udenom <= 0.0) {
    return vec3.set(out, 0.0, 0.0, 1.0); // Vertex region early out
  }
  // P is outside (or on) AB if the triple scalar product [N PA PB] <= 0
  const n = vec3.cross(vec3.create(), ab, ac);
  const vc = mixed(n, ap, bp);

  // If P outside AB and within feature region of AB,
  // return projection of P onto AB
  if (vc <= 0.0 && snom >= 0.0 && sdenom >= 0.0) {
    const t = snom / (snom + sdenom);
    return vec3.set(out, 1.0 - t, t, 0.0);
  }

  // P is outside (or on) BC if the triple scalar product [N PB PC] <= 0
  const va = mixed(n, bp, cp);

  // If P outside BC and within feature region of BC,
  // return projection of P onto BC
  if (va <= 0.0 && unom >= 0.0 && udenom >= 0.0) {
    const t = unom / (unom + udenom);
    return vec3.set(out, 0.0, 1.0 - t, t);
  }

  // P is outside (or on) CA if the triple scalar product [N PC PA] <= 0
  const vb = mixed(n, cp, ap);

  // If P outside CA and within feature region of CA,
  // return projection of P onto CA
  if (vb <= 0.0 && tnom >= 0.0 && tdenom >= 0.0) {
    const t = tnom / (tnom + tdenom);
    return vec3.set(out, 1.0 - t, 0.0, t);
  }

  // P must project inside face region. Compute Q using barycentric coordinates
  const u = va / (va + vb + vc);
  const v = vb / (va + vb + vc);
  const w = 1.0 - u - v; // = vc / (va + vb + vc)

  return vec3.set(out, u, v, w);
};

export const closestPointToLineSegment = (
  out: vec2,
  a: vec3,
  b: vec3,
  p: vec3
): vec2 => {
  const ab = vec3.sub(vec3.create(), b, a);
  const ap = vec3.sub(vec3.create(), p, a);

  // Project c onto ab, computing parameterized position d(t)=a+ t*(b – a)
  let t = vec3.dot(ap, ab) / vec3.dot(ab, ab);

  // If outside segment, clamp t (and therefore d) to the closest endpoint
  if (t < 0.0) {
    t = 0.0;
  }
  if (t > 1.0) {
    t = 1.0;
  }

  return vec2.set(out, 1.0 - t, t);
};
