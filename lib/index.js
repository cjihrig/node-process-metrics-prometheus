'use strict';
const EventEmitter = require('events');
const NodeProcessMetrics = require('node-process-metrics');
const Prom = require('prom-dress');

const defaults = { registries: [Prom.defaultRegistry] };


class PrometheusNodeProcessEmitter extends EventEmitter {
  constructor (options) {
    super();

    const settings = Object.assign({}, defaults, options);

    if (settings.metrics === undefined) {
      this._metrics = new NodeProcessMetrics();
    } else if (!(settings.metrics instanceof NodeProcessMetrics)) {
      throw new TypeError('metrics must be an instance of NodeProcessMetrics');
    } else {
      this._metrics = settings.metrics;
    }

    this._metrics.on('metrics', emitMetrics.bind(this));

    const registries = settings.registries;
    this._registries = registries;

    if (!Array.isArray(settings.registries)) {
      throw new TypeError('registries must be a CollectorRegistry array');
    }

    this._collectors = {
      rss: new Prom.Gauge({
        name: 'process_resident_memory_bytes',
        help: 'Resident memory size in bytes.',
        registries
      }),
      loop: new Prom.Gauge({
        name: 'nodejs_event_loop_delay',
        help: 'Delay of the Node.js event loop',
        registries
      }),
      handles: new Prom.Gauge({
        name: 'nodejs_active_handles',
        help: 'Number of active handles',
        registries
      }),
      requests: new Prom.Gauge({
        name: 'nodejs_active_requests',
        help: 'Number of active requests',
        registries
      })
    };
  }

  metrics () {
    const pm = this._metrics.metrics();

    this._collectors.rss.set(pm.process.memoryUsage.rss);
    this._collectors.loop.set(Number.isNaN(pm.loop) ? 0 : pm.loop);
    this._collectors.handles.set(pm.handles);
    this._collectors.requests.set(pm.requests);

    if (this._registries.length === 0) {
      return null;
    } else if (this._registries.length === 1) {
      return this._registries[0].report();
    }

    return this._registries.map((registry) => {
      return registry.report();
    });
  }

  destroy () {
    this._registries.forEach((registry) => {
      for (const key in this._collectors) {
        registry.unregister(this._collectors[key]);
      }
    });

    this._metrics = null;
    this._registries = null;
    this._collectors = null;
  }
}

module.exports = PrometheusNodeProcessEmitter;


function emitMetrics (metrics) {
  this.emit('metrics', this.metrics());
}
