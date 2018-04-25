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
      process: new Prom.Gauge({
        name: 'nodejs_process_configuration',
        help: 'Node.js process configuration data.',
        labels: ['execPath', 'mainModule', 'title', 'pid'],
        registries
      }),
      system: new Prom.Gauge({
        name: 'nodejs_system_configuration',
        help: 'Node.js system configuration data.',
        labels: ['arch', 'hostname', 'platform'],
        registries
      }),
      versions: new Prom.Gauge({
        name: 'nodejs_versions',
        help: 'Node.js version data.',
        labels: Object.keys(process.versions),
        registries
      }),
      heapTotal: new Prom.Gauge({
        name: 'nodejs_process_heap_total_bytes',
        help: 'Process total heap size in bytes.',
        registries
      }),
      heap: new Prom.Gauge({
        name: 'process_heap_bytes',
        help: 'Process heap size in bytes.',
        registries
      }),
      external: new Prom.Gauge({
        name: 'nodejs_process_external_bytes',
        help: 'Process external memory usage size in bytes.',
        registries
      }),
      rss: new Prom.Gauge({
        name: 'process_resident_memory_bytes',
        help: 'Resident memory size in bytes.',
        registries
      }),
      totalmem: new Prom.Gauge({
        name: 'nodejs_system_totalmem_bytes',
        help: 'System total memory size in bytes.',
        registries
      }),
      freemem: new Prom.Gauge({
        name: 'nodejs_system_freemem_bytes',
        help: 'System free memory size in bytes.',
        registries
      }),
      processStartTime: new Prom.Gauge({
        name: 'process_start_time_seconds',
        help: 'Start time of the process since unix epoch in seconds.',
        registries
      }),
      systemStartTime: new Prom.Gauge({
        name: 'nodejs_system_start_time_seconds',
        help: 'Start time of the system since unix epoch in seconds.',
        registries
      }),
      loop: new Prom.Gauge({
        name: 'nodejs_event_loop_delay',
        help: 'Delay of the Node.js event loop.',
        registries
      }),
      handles: new Prom.Gauge({
        name: 'nodejs_active_handles',
        help: 'Number of active handles.',
        registries
      }),
      requests: new Prom.Gauge({
        name: 'nodejs_active_requests',
        help: 'Number of active requests.',
        registries
      }),
      loadavg: new Prom.Gauge({
        name: 'nodejs_system_loadavg',
        help: 'Operating system 1, 5, and 15 minute load averages.',
        labels: ['span'],
        registries
      })
    };

    this._initialized = false;
  }

  metrics () {
    const pm = this._metrics.metrics();

    if (this._initialized === false) {
      this._initialized = true;
      initMetrics(this, pm);
    }

    this._collectors.heapTotal.set(pm.process.memoryUsage.heapTotal);
    this._collectors.heap.set(pm.process.memoryUsage.heapUsed);
    this._collectors.external.set(pm.process.memoryUsage.external);
    this._collectors.rss.set(pm.process.memoryUsage.rss);
    this._collectors.freemem.set(pm.system.freemem);
    this._collectors.loop.set(Number.isNaN(pm.loop) ? 0 : pm.loop);
    this._collectors.handles.set(pm.handles);
    this._collectors.requests.set(pm.requests);
    this._collectors.loadavg.set(pm.system.loadavg[0], { span: '1min' });
    this._collectors.loadavg.set(pm.system.loadavg[1], { span: '5min' });
    this._collectors.loadavg.set(pm.system.loadavg[2], { span: '15min' });

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


function initMetrics (ee, metrics) {
  const collectors = ee._collectors;
  const now = Date.now();
  const processStartTimeSec = Math.round((now / 1000) - metrics.process.uptime);
  const systemStartTimeSec = Math.round((now / 1000) - metrics.system.uptime);

  collectors.processStartTime.set(processStartTimeSec);
  collectors.systemStartTime.set(systemStartTimeSec);
  collectors.totalmem.set(metrics.system.totalmem);
  collectors.process.set(1, { execPath: metrics.process.execPath });
  collectors.process.set(1, { mainModule: metrics.process.mainModule });
  collectors.process.set(1, { title: metrics.process.title });
  collectors.process.set(1, { pid: metrics.process.pid });
  collectors.system.set(1, { arch: metrics.system.arch });
  collectors.system.set(1, { hostname: metrics.system.hostname });
  collectors.system.set(1, { platform: metrics.system.platform });

  Object.keys(process.versions).forEach((key) => {
    collectors.versions.set(1, { [key]: metrics.process.versions[key] });
  });
}
