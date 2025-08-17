'use strict';

const fraudDetection = require('..');
const assert = require('assert').strict;

assert.strictEqual(fraudDetection(), 'Hello from fraudDetection');
console.info('fraudDetection tests passed');
