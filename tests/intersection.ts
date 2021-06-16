import { vec3, vec4 } from 'gl-matrix';

import { areIntersect } from '../src';
import TestViewportBase from './test-viewport-base.class';

export class IntersectionView extends TestViewportBase {
  protected test() {
    this.simplex.clear();
    const dir = vec3.create();
    vec3.subtract(
      dir,
      this.axes1.targetTransform.position,
      this.axes2.targetTransform.position
    );
    const are = areIntersect(
      this.simplex,
      this.shape1,
      this.shape2,
      dir,
      this.gjkPanel.state.epsilon,
      this.gjkPanel.state.maxIterations
    );
    this.drawables[1].material.uniforms[
      'albedo'
    ] = this.drawables[2].material.uniforms['albedo'] = are
      ? vec4.fromValues(1.0, 1.0, 0.2, 1.0)
      : vec4.fromValues(0.0, 0.2, 1.0, 1.0);
  }
}
