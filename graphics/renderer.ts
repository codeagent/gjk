import { Camera } from './camera';
import { Transform } from './transform';

export type Shader = WebGLProgram;
export type Cubemap = WebGLTexture;
export type Texture2d = WebGLTexture;
export type VertexBuffer = WebGLBuffer;
export type IndexBuffer = WebGLBuffer;
export type RenderTarget = WebGLFramebuffer;

export interface Material {
  shader: Shader;
  uniforms?: {
    [name: string]: Float32Array | number[] | number; 
  };
  state?: {
    cullFace?: GLenum | boolean;
    zWrite?: boolean;
    zTest?: boolean;
  };
}

export interface VertexAttribute {
  semantics: string;
  slot: number;
  size: number;
  type: GLenum;
  offset: number;
  stride: number;
}

export interface Geometry {
  vao: WebGLVertexArrayObject;
  vbo: VertexBuffer;
  ebo: IndexBuffer;
  length: number;
  type: GLenum;
}

export interface Mesh {
  vertexFormat: VertexAttribute[];
  vertexData: ArrayBufferView;
  indexData: Uint16Array;
}

export interface Drawable {
  material: Material;
  geometry: Geometry;
  transform: Transform;
}

export class Renderer {

  private activeTarget: RenderTarget;

  get context() {
    return this._gl;
  }

  constructor(private _gl: WebGL2RenderingContext) {
    _gl.clearColor(0.1, 0.1, 0.1, 1.0);
    _gl.clearDepth(1.0);
    _gl.lineWidth(2);
    _gl.enable(WebGL2RenderingContext.DEPTH_TEST);
    _gl.enable(WebGL2RenderingContext.CULL_FACE);
    _gl.enable(WebGL2RenderingContext.BLEND);
    _gl.blendFunc(WebGL2RenderingContext.SRC_ALPHA, WebGL2RenderingContext.ONE_MINUS_SRC_ALPHA);
    _gl.pixelStorei(WebGL2RenderingContext.UNPACK_ALIGNMENT, 4);
    _gl.depthFunc(WebGL2RenderingContext.LEQUAL);
    _gl.viewport(0, 0, _gl.canvas.width, _gl.canvas.height);
  }

  clear(mask: GLenum = WebGL2RenderingContext.COLOR_BUFFER_BIT | WebGL2RenderingContext.DEPTH_BUFFER_BIT) {
    if (this.activeTarget === null) {
      this._gl.clear(mask);
    } else {
      if(mask & WebGL2RenderingContext.COLOR_BUFFER_BIT) {
        this._gl.clearBufferuiv(WebGL2RenderingContext.COLOR, 0, [0, 0, 0, 0]);
      }
      if(mask &  WebGL2RenderingContext.DEPTH_BUFFER_BIT) {
        this._gl.clearBufferfv(WebGL2RenderingContext.DEPTH, 0, [1.0]);
      }
    }
  }

  createGeometry(mesh: Mesh, type: GLenum = WebGL2RenderingContext.TRIANGLES): Geometry {
    const vBuffer = this.createVertexBuffer(mesh.vertexData);
    const iBuffer = this.createIndexBuffer(mesh.indexData);

    const vao = this._gl.createVertexArray();
    this._gl.bindVertexArray(vao);
    for (const attribute of mesh.vertexFormat) {
      this._gl.enableVertexAttribArray(attribute.slot);
      this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, vBuffer);
      if (attribute.type === WebGL2RenderingContext.FLOAT) {
        this._gl.vertexAttribPointer(
          attribute.slot,
          attribute.size,
          attribute.type,
          false,
          attribute.stride,
          attribute.offset
        );
      } else {
        this._gl.vertexAttribIPointer(
          attribute.slot,
          attribute.size,
          attribute.type,
          attribute.stride,
          attribute.offset
        );
      }
    }
    this._gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, iBuffer);
    this._gl.bindVertexArray(null);
    return { vao, vbo: vBuffer, ebo: iBuffer, length: mesh.indexData.length, type };
  }

  createShader(vs: string, fs: string) {
    const gl = this._gl;
    const program = gl.createProgram();
    let shaders = [];
    try {
      for (const shader of [
        { type: WebGL2RenderingContext.VERTEX_SHADER, sourceCode: vs },
        { type: WebGL2RenderingContext.FRAGMENT_SHADER, sourceCode: fs },
      ]) {
        const shaderObject = gl.createShader(shader.type);
        gl.shaderSource(shaderObject, shader.sourceCode);
        gl.compileShader(shaderObject);
        if (!gl.getShaderParameter(shaderObject, WebGL2RenderingContext.COMPILE_STATUS)) {
          throw new Error(
            `${
              shader.type === WebGL2RenderingContext.VERTEX_SHADER ? 'Vertex' : 'Fragment'
            } shader compile error: '${gl.getShaderInfoLog(shaderObject)}' \n${shader.sourceCode}\n`
          );
        }
        gl.attachShader(program, shaderObject);
        shaders.push(shaderObject);
      }

      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, WebGL2RenderingContext.LINK_STATUS)) {
        throw new Error(`Unable to initialize the shader program: '${gl.getProgramInfoLog(program)}'`);
      }
    } catch (e) {
      shaders.forEach((shader) => gl.deleteShader(shader));
      gl.deleteProgram(program);
      throw e;
    }

    return program;
  }

  drawGeometry(camera: Camera, drawable: Drawable) {
    this._gl.useProgram(drawable.material.shader);
    let loc;

    // Material uniforms
    const uniforms = { ...drawable.material.uniforms };
    for (const name in uniforms) {
      loc = this._gl.getUniformLocation(drawable.material.shader, name);
      if (typeof uniforms[name] === 'number') {
        this._gl.uniform1f(loc, uniforms[name] as number);
      } else if ((uniforms[name] as number[]).length === 3) {
        this._gl.uniform3fv(loc, uniforms[name] as number[]);
      } else {
        this._gl.uniform4fv(loc, uniforms[name] as number[]);
      }
    }

    loc = this._gl.getUniformLocation(drawable.material.shader, 'worldMat');
    if (loc) {
      this._gl.uniformMatrix4fv(loc, false, drawable.transform.transform);
    }

    loc = this._gl.getUniformLocation(drawable.material.shader, 'viewMat');
    if (loc) {
      this._gl.uniformMatrix4fv(loc, false, camera.view);
    }

    loc = this._gl.getUniformLocation(drawable.material.shader, 'projMat');
    if (loc) {
      this._gl.uniformMatrix4fv(loc, false, camera.projection);
    }

    loc = this._gl.getUniformLocation(drawable.material.shader, 'pos');
    if (loc) {
      this._gl.uniform3fv(loc, camera.position);
    }

    if (drawable.material.state) {
      if (drawable.material.state.cullFace === false) {
        this._gl.disable(WebGL2RenderingContext.CULL_FACE);
      } else {
        this._gl.enable(WebGL2RenderingContext.CULL_FACE);
        this._gl.cullFace((drawable.material.state.cullFace as GLenum) ?? WebGL2RenderingContext.BACK);
      }
      this._gl.depthMask(drawable.material.state.zWrite ?? true);

      const depthTest = drawable.material.state.zTest ?? true;
      if (depthTest) {
        this._gl.enable(WebGL2RenderingContext.DEPTH_TEST);
      } else {
        this._gl.disable(WebGL2RenderingContext.DEPTH_TEST);
      }
    } else {
      this._gl.enable(WebGL2RenderingContext.DEPTH_TEST);
      this._gl.enable(WebGL2RenderingContext.CULL_FACE);
      this._gl.cullFace(WebGL2RenderingContext.BACK);
      this._gl.depthMask(true);
    }

    this._gl.bindVertexArray(drawable.geometry.vao);
    this._gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, drawable.geometry.ebo);
    this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, drawable.geometry.vbo);

    if(this._gl.getError() !== WebGL2RenderingContext.NO_ERROR ) {
      debugger;
    }
    this._gl.drawElements(
      drawable.geometry.type ?? WebGL2RenderingContext.TRIANGLES,
      drawable.geometry.length,
      WebGL2RenderingContext.UNSIGNED_SHORT,
      0
    );

    if(this._gl.getError() !== WebGL2RenderingContext.NO_ERROR ) {
      debugger;
    }
  }

  createIdRenderTarget(): RenderTarget {
    // color
    const texture = this._gl.createTexture();
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, texture);
    this._gl.texImage2D(
      WebGL2RenderingContext.TEXTURE_2D,
      0,
      WebGL2RenderingContext.R16UI,
      this._gl.canvas.width,
      this._gl.canvas.height,
      0,
      WebGL2RenderingContext.RED_INTEGER,
      WebGL2RenderingContext.UNSIGNED_SHORT,
      null
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      WebGL2RenderingContext.NEAREST
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      WebGL2RenderingContext.NEAREST
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      WebGL2RenderingContext.CLAMP_TO_EDGE
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      WebGL2RenderingContext.CLAMP_TO_EDGE
    );
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);


    // depth buffer
    const depth = this._gl.createTexture();
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, depth);
    this._gl.texImage2D(
      WebGL2RenderingContext.TEXTURE_2D,
      0,
      WebGL2RenderingContext.DEPTH_COMPONENT16,
      this._gl.canvas.width,
      this._gl.canvas.height,
      0,
      WebGL2RenderingContext.DEPTH_COMPONENT,
      WebGL2RenderingContext.UNSIGNED_SHORT,
      null
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MAG_FILTER,
      WebGL2RenderingContext.NEAREST
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_MIN_FILTER,
      WebGL2RenderingContext.NEAREST
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_S,
      WebGL2RenderingContext.CLAMP_TO_EDGE
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_WRAP_T,
      WebGL2RenderingContext.CLAMP_TO_EDGE
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_COMPARE_MODE,
      WebGL2RenderingContext.COMPARE_REF_TO_TEXTURE
    );
    this._gl.texParameteri(
      WebGL2RenderingContext.TEXTURE_2D,
      WebGL2RenderingContext.TEXTURE_COMPARE_FUNC,
      WebGL2RenderingContext.GREATER
    );
    this._gl.bindTexture(WebGL2RenderingContext.TEXTURE_2D, null);

    const fb = this._gl.createFramebuffer();
    this._gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, fb);
    this._gl.framebufferTexture2D(
      WebGL2RenderingContext.FRAMEBUFFER,
      WebGL2RenderingContext.COLOR_ATTACHMENT0,
      WebGL2RenderingContext.TEXTURE_2D,
      texture,
      0
    );
    this._gl.framebufferTexture2D(
      WebGL2RenderingContext.FRAMEBUFFER,
      WebGL2RenderingContext.DEPTH_ATTACHMENT,
      WebGL2RenderingContext.TEXTURE_2D,
      depth,
      0
    );
    
    const status = this._gl.checkFramebufferStatus(WebGL2RenderingContext.FRAMEBUFFER);
    if (status !== WebGL2RenderingContext.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Incomplete frame buffer, status: ${status}`);
    }
    this._gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, null);

    return fb;
  }

  setRenderTarget(target: RenderTarget) {
    this._gl.bindFramebuffer(WebGL2RenderingContext.FRAMEBUFFER, target);
    this.activeTarget = target;
  }

  destroyShader(shader: Shader) {
    this._gl.deleteProgram(shader);
  }

  destroyGeometry(geometry: Geometry) {
    this._gl.deleteBuffer(geometry.ebo);
    this._gl.deleteBuffer(geometry.vbo);
    this._gl.deleteVertexArray(geometry.vao);
  }

  destroyRenderTarget(target: RenderTarget) {
    this._gl.deleteFramebuffer(target);
  }

  readAsIdMap() {
    const data = new Uint16Array(this._gl.canvas.width * this._gl.canvas.height);
    this._gl.readPixels(
      0, 
      0, 
      this._gl.canvas.width, 
      this._gl.canvas.height, 
      WebGL2RenderingContext.RED_INTEGER, 
      WebGL2RenderingContext.UNSIGNED_SHORT, 
      data
    ); 
    return data;
  }

  private createVertexBuffer(data: ArrayBufferView): VertexBuffer {
    const vbo = this._gl.createBuffer();
    this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, vbo);
    this._gl.bufferData(WebGL2RenderingContext.ARRAY_BUFFER, data, WebGL2RenderingContext.STATIC_DRAW);
    this._gl.bindBuffer(WebGL2RenderingContext.ARRAY_BUFFER, null);
    return vbo;
  }

  private createIndexBuffer(data: ArrayBufferView): IndexBuffer {
    const ebo = this._gl.createBuffer();
    this._gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, ebo);
    this._gl.bufferData(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, data, WebGL2RenderingContext.STATIC_DRAW);
    this._gl.bindBuffer(WebGL2RenderingContext.ELEMENT_ARRAY_BUFFER, null);
    return ebo;
  }
}
