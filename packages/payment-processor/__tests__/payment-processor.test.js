'use strict';

const paymentProcessor = require('..');
const assert = require('assert').strict;

assert.strictEqual(paymentProcessor(), 'Hello from paymentProcessor');
console.info('paymentProcessor tests passed');
