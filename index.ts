
import 'uikit/dist/css/uikit.css';
import 'uikit/dist/js/uikit.js';
import './style.css';
import { fromEvent, merge, of } from 'rxjs';
import { distinctUntilChanged, filter, mapTo } from 'rxjs/operators';

import { IntersectionTest, ClosestsTest, SubdivisionsTest, ContactsTest, SimplexView } from './tests';
import { ViewportInterface } from './tests/viewport.interface';
// import './jasmine';

// import './tests/closests';
// import './tests/subdivision';
// import './tests/depth';

const objectsCanvas = document.getElementById('objects') as HTMLCanvasElement;
const simplexCanvas = document.getElementById('simpex') as HTMLCanvasElement;

// let active: ViewportInterface = null;
const intersectionTest = new IntersectionTest();
const closestsTest = new ClosestsTest();
const subdivisionTest = new SubdivisionsTest();
const contactsTest = new ContactsTest();

const intersectionTestSimpelexView = new SimplexView(intersectionTest.simplex);
const closestsTestSimpelexView = new SimplexView(closestsTest.simplex);
const contactsTestSimplexView = new SimplexView(contactsTest.simplex);

let active:ViewportInterface[] = [];

merge(
  fromEvent(document.querySelector('[href="#/intersection"]'), 'click').pipe(
    mapTo([intersectionTest, intersectionTestSimpelexView])
  ),

  fromEvent(document.querySelector('[href="#/closests"]'), 'click').pipe(
    mapTo([closestsTest, closestsTestSimpelexView])
  ),

  fromEvent(document.querySelector('[href="#/subdivisions"]'), 'click').pipe(
    mapTo([subdivisionTest])
  ),

   fromEvent(document.querySelector('[href="#/contacts"]'), 'click').pipe(
    mapTo([contactsTest, contactsTestSimplexView])
  ),
  of([intersectionTest, intersectionTestSimpelexView])
)
  .pipe(
    distinctUntilChanged(),
    filter(c => !!c)
  )
  .subscribe((viewports: ViewportInterface[]) => {
    if (active.length) {
      active.forEach(a => a.disconnect());
    }
    viewports[0].connect(objectsCanvas);
    if(viewports[1]) {
      viewports[1].connect(simplexCanvas);
    }
    active = viewports;
  });

const frame = () => {
  active.forEach(a => a?.frame());
  requestAnimationFrame(frame);
};

setTimeout(() => frame(), 1000)

