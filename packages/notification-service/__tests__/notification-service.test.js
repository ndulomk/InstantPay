'use strict';

const notificationService = require('..');
const assert = require('assert').strict;

assert.strictEqual(notificationService(), 'Hello from notificationService');
console.info('notificationService tests passed');
