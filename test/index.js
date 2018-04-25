'use strict';
const Barrier = require('cb-barrier');
const Code = require('code');
const Lab = require('lab');
const NodeProcessMetrics = require('node-process-metrics');
const { CollectorRegistry, defaultRegistry } = require('prom-dress');
const NPMP = require('../lib');

// Test shortcuts
const lab = exports.lab = Lab.script();
const { describe, it } = lab;
const { expect } = Code;


describe('Node Process Metrics - Prometheus', () => {
  it('captures expected metrics', () => {
    const ee = new NPMP();

    expect(ee).to.be.an.instanceOf(NPMP);
    expect(ee._metrics).to.be.an.instanceOf(NodeProcessMetrics);
    expect(ee._registries).to.equal([defaultRegistry]);
    expect(ee._collectors).to.be.an.object();
    checkMetrics(ee.metrics());

    ee.destroy();
    expect(ee._metrics).to.equal(null);
    expect(ee._registries).to.equal(null);
    expect(ee._collectors).to.equal(null);
    expect(defaultRegistry._collectors.size).to.equal(0);
  });

  it('can function as an event emitter', () => {
    const barrier = new Barrier();
    const cr = new CollectorRegistry();
    const npm = new NodeProcessMetrics({ period: 100 });
    const ee = new NPMP({ metrics: npm, registries: [cr] });

    ee.on('metrics', (metrics) => {
      checkMetrics(metrics);
      barrier.pass();
    });

    return barrier;
  });

  it('allows a NodeProcessMetrics instance to be passed in', () => {
    const npm = new NodeProcessMetrics();
    const ee = new NPMP({ metrics: npm, registries: [] });

    expect(ee._metrics).to.shallow.equal(npm);
  });

  it('throws on bad inputs', () => {
    expect(() => {
      new NPMP({ metrics: {} });      // eslint-disable-line no-new
    }).to.throw(TypeError, 'metrics must be an instance of NodeProcessMetrics');

    expect(() => {
      new NPMP({ registries: {} });   // eslint-disable-line no-new
    }).to.throw(TypeError, 'registries must be a CollectorRegistry array');
  });

  it('reports null if there are no registries', () => {
    const ee = new NPMP({ registries: [] });

    expect(ee.metrics()).to.equal(null);
  });

  it('reports an array if there are multiple registries', () => {
    const cr1 = new CollectorRegistry();
    const cr2 = new CollectorRegistry();
    const ee = new NPMP({ registries: [cr1, cr2] });
    const metrics = ee.metrics();

    expect(metrics).to.be.an.array();
    expect(metrics.length).to.equal(2);
    expect(metrics[0]).to.equal(metrics[1]);
    checkMetrics(metrics[0]);
  });

  it('loop time is zero if not enabled', () => {
    const npm = new NodeProcessMetrics({ loop: false });
    const ee = new NPMP({ metrics: npm, registries: [new CollectorRegistry()] });

    expect(ee.metrics()).to.match(/nodejs_event_loop_delay 0/);
  });

  it('only gathers certain metrics on the initial collection', () => {
    const ee = new NPMP({ registries: [new CollectorRegistry()] });

    ee._initialized = true;
    expect(ee.metrics()).to.not.match(/nodejs_versions\{v8="/);
  });
});


function checkMetrics (metrics) {
  expect(metrics).to.be.a.string();
  // TODO: Add more validation for the metrics string.
}
