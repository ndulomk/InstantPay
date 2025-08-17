'use strict';

const gatewayApi = require('..');
const assert = require('assert').strict;

assert.strictEqual(gatewayApi(), 'Hello from gatewayApi');
console.info('gatewayApi tests passed');
