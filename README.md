# node-process-metrics-prometheus

[![Current Version](https://img.shields.io/npm/v/node-process-metrics-prometheus.svg)](https://www.npmjs.org/package/node-process-metrics-prometheus)
[![Build Status via Travis CI](https://travis-ci.org/cjihrig/node-process-metrics-prometheus.svg?branch=master)](https://travis-ci.org/cjihrig/node-process-metrics-prometheus)
![Dependencies](http://img.shields.io/david/cjihrig/node-process-metrics-prometheus.svg)
[![belly-button-style](https://img.shields.io/badge/eslint-bellybutton-4B32C3.svg)](https://github.com/cjihrig/belly-button)

Get process, system, memory, CPU, and event loop metrics from a Node.js process in Prometheus text-based exposition format. Can be used synchronously, or as an event emitter.

## Basic Usage

```javascript
'use strict';
const NodeProcessMetrics = require('node-process-metrics');
const NodeProcessMetricsPrometheus = require('node-process-metrics-prometheus');

// Use synchronously
const pm = new NodeProcessMetricsPrometheus();
console.log(pm.metrics());

// Use as an event emitter
const pm = new NodeProcessMetricsPrometheus({
  metrics: new NodeProcessMetrics({ period: 1000 })
});

pm.on('metrics', (metrics) => {
  console.log(metrics);
});
```

## API

`node-process-metrics` exports a single constructor with the following API.

### `NodeProcessEmitter([options])`

  - Arguments
    - `options` (object) - An optional configuration supporting the following options:
      - `metrics` (number) - An instance of `NodeProcessMetrics`. Optional. If not provided, a new instance is constructed.
      - `registries` (array) - An array of `CollectorRegistry` instances. Optional. Defaults to `[PromDress.defaultRegistry]`.

### `'metrics'` Event

The `'metrics'` event has one accompanying argument - a Prometheus exposition string.
