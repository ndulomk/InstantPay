'use strict';

const adminDashboard = require('..');
const assert = require('assert').strict;

assert.strictEqual(adminDashboard(), 'Hello from adminDashboard');
console.info('adminDashboard tests passed');
