import 'uikit/dist/css/uikit.css';
import 'uikit/dist/js/uikit.js';

import { fromEvent, merge, of } from 'rxjs';
import { distinctUntilChanged, filter, mapTo } from 'rxjs/operators';

import { IntersectionTest, ClosestsTest, SubdivisionsTest, ContactsTest } from './tests';
import { ViewportInterface } from './tests/viewport.interface';
// import './jasmine';

// import './tests/closests';
// import './tests/subdivision';
// import './tests/depth';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
let active: ViewportInterface = null;
const intersectionTest = new IntersectionTest();
const closestsTest = new ClosestsTest();
const subdivisionTest = new SubdivisionsTest();
const contactsTest = new ContactsTest();

merge(
  fromEvent(document.querySelector('[href="#/intersection"]'), 'click').pipe(
    mapTo(intersectionTest)
  ),

  fromEvent(document.querySelector('[href="#/closests"]'), 'click').pipe(
    mapTo(closestsTest)
  ),

  fromEvent(document.querySelector('[href="#/subdivisions"]'), 'click').pipe(
    mapTo(subdivisionTest)
  ),

   fromEvent(document.querySelector('[href="#/contacts"]'), 'click').pipe(
    mapTo(contactsTest)
  ),
  of(intersectionTest)
)
  .pipe(
    distinctUntilChanged(),
    filter(c => !!c)
  )
  .subscribe((test: ViewportInterface) => {
    if (active) {
      active.disconnect();
    }
    test.connect(canvas);
    active = test;
  });

const frame = () => {
  active?.frame()
  requestAnimationFrame(frame);
};
frame();
