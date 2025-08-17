'use strict';

const reconciliation = require('..');
const assert = require('assert').strict;

assert.strictEqual(reconciliation(), 'Hello from reconciliation');
console.info('reconciliation tests passed');
