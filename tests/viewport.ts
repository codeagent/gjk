export interface ViewportInterface {
  connect(canvas: HTMLCanvasElement): void;
  disconnect(canvas: HTMLCanvasElement): void;
}
