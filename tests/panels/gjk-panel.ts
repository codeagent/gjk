import { BehaviorSubject, fromEvent, merge, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

export interface GjkPanelOptions {
  time: number;
  simplexSize: number;
  maxIterations: number;
  epsilon: number;
}

export class GjkPanel {
  private readonly state$ = new BehaviorSubject<GjkPanelOptions>(null);
  private readonly release$ = new Subject<void>();

  private time: HTMLDivElement;
  private size: HTMLDivElement;
  private iterations: HTMLInputElement;
  private epsilon: HTMLInputElement;

  get state(): GjkPanelOptions {
    return this.state$.value;
  }

  constructor(
    readonly element: HTMLElement,
    readonly options: GjkPanelOptions
  ) {
    this.state$.next(options);

    this.attachListeners(element);
    this.write(options);
  }

  private attachListeners(element: HTMLElement) {
    this.time = element.querySelector<HTMLDivElement>('.t');
    this.size = element.querySelector<HTMLDivElement>('.s');
    this.iterations = element.querySelector<HTMLInputElement>('input.i');
    this.epsilon = element.querySelector<HTMLInputElement>('input.e');

    merge(
      fromEvent(this.iterations, 'input').pipe(
        map(() => ({
          ...this.state$.value,
          maxIterations: +this.iterations.value
        }))
      ),
      fromEvent(this.epsilon, 'input').pipe(
        map(() => ({
          ...this.state$.value,
          epsilon: +this.epsilon.value
        }))
      )
    )
      .pipe(takeUntil(this.release$))
      .subscribe((options: GjkPanelOptions) => this.state$.next(options));
  }

  write(options: GjkPanelOptions) {
    this.time.innerText = `${options.time.toPrecision(2)} s`;
    this.size.innerText = `${options.simplexSize}`;
    this.iterations.value = `${options.maxIterations}`;
    this.epsilon.value = `${options.epsilon}`;
  }

  onChanges() {
    return this.state$.asObservable();
  }

  release() {
    this.release$.next();
  }
}
