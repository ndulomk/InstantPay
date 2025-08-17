'use strict';

const database = require('..');
const assert = require('assert').strict;

assert.strictEqual(database(), 'Hello from database');
console.info('database tests passed');
