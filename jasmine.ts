// Testing setup by Gerard Sans (https://stackblitz.com/@gsans)

import jasmineRequire from 'jasmine-core/lib/jasmine-core/jasmine.js';
window.jasmineRequire = jasmineRequire;

import 'jasmine-core/lib/jasmine-core/jasmine.css';
import 'jasmine-core/lib/jasmine-core/jasmine-html.js';
import 'jasmine-core/lib/jasmine-core/boot.js';

import './src/math.spec';
import './src/priority-queue.spec';

(function bootstrap() {
  if (window.jasmineRef) {
    location.reload();

    return;
  }

  window.onload(new Event('anything'));
  window.jasmineRef = jasmine.getEnv();
})();
