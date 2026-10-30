// MockSmith Hackathon Demo Video Script & Scene Specification
// Combines 1920x1080 Information Visualization Slides with Live Browser Automation
const path = require('node:path');

const slidesDir = path.resolve(__dirname, 'slides');

module.exports = [
  // -------------------------------------------------------------
  // ACT 1: Hook & Core Problem
  // -------------------------------------------------------------
  {
    name: "01-title",
    card: {
      image: path.join(slidesDir, '01-title.png')
    },
    duration: 8,
    vo: "Meet MockSmith: a zero-configuration, stateful mock REST server and real-time network chaos sandbox for frontend and mobile engineering teams."
  },
  {
    name: "02-problem-matrix",
    card: {
      image: path.join(slidesDir, '02-problem.png')
    },
    duration: 9,
    vo: "Traditional mocking tools return static, stateless fixtures. They don't track state mutations, and configuring packet jitter or 429 rate limits requires heavy, fragile proxies."
  },

  // -------------------------------------------------------------
  // ACT 2: System Architecture & Live REST Operation
  // -------------------------------------------------------------
  {
    name: "03-architecture",
    card: {
      image: path.join(slidesDir, '03-architecture.png')
    },
    duration: 10,
    vo: "MockSmith's architecture automatically ingests OpenAPI 3.0 or raw JSON models, synthesizes relational schemas via FakerLite, and provides live in-memory CRUD operations with zero cloud dependencies."
  },
  {
    name: "04-live-api-dispatcher",
    url: "https://georgefifth.github.io/mocksmith/",
    actions: [
      { type: "waitFor", sel: "#req-url" },
      { type: "click", sel: "#req-url" },
      { type: "click", sel: 'button:has-text("Send Request")' },
      { type: "waitFor", sel: "#console-response-box" },
      { type: "wait", ms: 1200 },
      { type: "click", sel: 'button:has-text("API Catalog & Routes")' },
      { type: "waitFor", sel: "#routes-tbody" },
      { type: "wait", ms: 1200 }
    ],
    vo: "In the embedded studio, developers can test any endpoint interactively. Every request updates relational tables and the live traffic stream in real time."
  },

  // -------------------------------------------------------------
  // ACT 3: Relational State & Query Operators
  // -------------------------------------------------------------
  {
    name: "05-relational-engine",
    card: {
      image: path.join(slidesDir, '04-relational-state.png')
    },
    duration: 10,
    vo: "Under the hood, MockSmith's relational store handles primary keys, foreign-key sub-resources, polymorphic oneOf discriminators, and advanced range queries like price greater than or equal to."
  },
  {
    name: "06-live-state-inspector",
    url: "https://georgefifth.github.io/mocksmith/",
    actions: [
      { type: "waitFor", sel: 'button:has-text("Database State")' },
      { type: "click", sel: 'button:has-text("Database State")' },
      { type: "waitFor", sel: "#state-table" },
      { type: "wait", ms: 1000 },
      { type: "click", sel: 'button:has-text("+ Add Record")' },
      { type: "waitFor", sel: "#modal-add" },
      { type: "wait", ms: 1200 },
      { type: "click", sel: 'button:has-text("Cancel")' },
      { type: "wait", ms: 800 }
    ],
    vo: "You can inspect and edit relational tables directly in the browser studio, with live schema validation and instant preset templates."
  },

  // -------------------------------------------------------------
  // ACT 4: Network Chaos Interceptor & Simulation
  // -------------------------------------------------------------
  {
    name: "07-chaos-architecture",
    card: {
      image: path.join(slidesDir, '05-chaos-engine.png')
    },
    duration: 9,
    vo: "To ensure your application survives production outages, MockSmith's chaos interceptor injects artificial latency, jitter bounds, simulated 429 rate limits, and bearer token expirations."
  },
  {
    name: "08-live-chaos-sandbox",
    url: "https://georgefifth.github.io/mocksmith/",
    actions: [
      { type: "waitFor", sel: 'button:has-text("Chaos Sandbox")' },
      { type: "click", sel: 'button:has-text("Chaos Sandbox")' },
      { type: "waitFor", sel: "#chaos-latency" },
      { type: "wait", ms: 1000 },
      { type: "click", sel: 'button:has-text("Live Traffic Stream")' },
      { type: "waitFor", sel: "#traffic-tbody" },
      { type: "wait", ms: 1200 }
    ],
    vo: "Simply adjust the live sliders. Your mock backend instantly injects delayed packets and HTTP error codes without restarting the dev server."
  },

  // -------------------------------------------------------------
  // ACT 5: Empirical Benchmark & Comparison
  // -------------------------------------------------------------
  {
    name: "09-empirical-benchmark",
    card: {
      image: path.join(slidesDir, '06-benchmark.png')
    },
    duration: 10,
    vo: "We validated MockSmith against authentic production specs: parsing Stripe's 3.6-megabyte schema in 672 milliseconds, with a 100% pass rate across all 21 real-world benchmark scenarios."
  },
  {
    name: "10-competitive-matrix",
    card: {
      image: path.join(slidesDir, '07-comparison.png')
    },
    duration: 11,
    vo: "Compared to alternatives, MockSmith combines the instant zero-config speed of json-server, the OpenAPI standards of Prism, and the power of WireMock into a single lightweight Node.js binary."
  },

  // -------------------------------------------------------------
  // ACT 6: Conclusion & Call to Action
  // -------------------------------------------------------------
  {
    name: "11-conclusion",
    card: {
      image: path.join(slidesDir, '08-conclusion.png')
    },
    duration: 8,
    vo: "MockSmith is fully open-source and local-first. Run it with npx mocksmith or try the interactive sandbox live in your browser today."
  }
];
