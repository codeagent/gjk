export interface ViewportInterface {
  connect(canvas: HTMLCanvasElement): void;
  frame(): void;
  disconnect(): void;
}
