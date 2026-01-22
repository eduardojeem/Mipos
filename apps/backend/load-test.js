const artillery = require('artillery');

const config = {
  target: 'http://localhost:4000',
  phases: [
    // Ramp up to 10 users over 30 seconds
    { duration: 30, arrivalRate: 1, rampTo: 10 },
    // Stay at 10 users for 1 minute
    { duration: 60, arrivalRate: 10 },
    // Ramp up to 50 users over 30 seconds
    { duration: 30, arrivalRate: 10, rampTo: 50 },
    // Stay at 50 users for 2 minutes
    { duration: 120, arrivalRate: 50 },
    // Ramp down to 0 users over 30 seconds
    { duration: 30, arrivalRate: 50, rampTo: 0 }
  ],
  defaults: {
    headers: {
      'Authorization': 'Bearer test-jwt-token',
      'Content-Type': 'application/json'
    }
  }
};

const scenarios = [
  {
    name: 'Products API Load Test',
    weight: 70,
    flow: [
      // Get products list
      {
        get: {
          url: '/api/products?page=1&limit=20',
          expect: [
            { statusCode: 200 },
            { hasProperty: 'products' },
            { hasProperty: 'pagination' }
          ]
        }
      },
      // Search products
      {
        get: {
          url: '/api/products?search=laptop&page=1&limit=10',
          expect: [
            { statusCode: 200 },
            { hasProperty: 'products' }
          ]
        }
      },
      // Get single product (simulate viewing details)
      {
        get: {
          url: '/api/products/prod_123', // This would need to be a real ID
          expect: [
            { statusCode: 404 } // Expected for test ID
          ]
        }
      }
    ]
  },
  {
    name: 'Advanced Search',
    weight: 20,
    flow: [
      {
        get: {
          url: '/api/products/search?q=laptop&sortBy=name&sortOrder=asc&page=1&limit=25',
          expect: [
            { statusCode: 200 },
            { hasProperty: 'products' },
            { hasProperty: 'search' }
          ]
        }
      }
    ]
  },
  {
    name: 'Export Operations',
    weight: 10,
    flow: [
      {
        get: {
          url: '/api/products/export?format=json',
          expect: [
            { statusCode: 200 },
            { hasProperty: 'products' },
            { hasProperty: 'count' }
          ]
        }
      }
    ]
  }
];

const script = {
  config,
  scenarios
};

// Run the test
artillery.run(script, (err, report) => {
  if (err) {
    console.error('Load test failed:', err);
    process.exit(1);
  }

  console.log('Load test completed successfully');
  console.log('Report:', JSON.stringify(report, null, 2));

  // Check performance thresholds
  const metrics = report.aggregate;
  const responseTime = metrics.summaries['http.response_time'];
  const errorRate = (metrics.counters['errors'] || 0) / metrics.counters['scenarios.created'] * 100;

  console.log('\n=== Performance Results ===');
  console.log(`Average Response Time: ${responseTime ? responseTime.mean : 'N/A'}ms`);
  console.log(`95th Percentile: ${responseTime ? responseTime.p95 : 'N/A'}ms`);
  console.log(`99th Percentile: ${responseTime ? responseTime.p99 : 'N/A'}ms`);
  console.log(`Error Rate: ${errorRate.toFixed(2)}%`);
  console.log(`Requests per Second: ${metrics.rates['http.request_rate'] || 0}`);

  // Performance assertions
  const assertions = {
    'Response time < 500ms': responseTime && responseTime.mean < 500,
    '95th percentile < 1000ms': responseTime && responseTime.p95 < 1000,
    'Error rate < 5%': errorRate < 5,
    'Min 10 RPS': (metrics.rates['http.request_rate'] || 0) >= 10
  };

  console.log('\n=== Performance Assertions ===');
  let allPassed = true;
  for (const [assertion, passed] of Object.entries(assertions)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${assertion}`);
    if (!passed) allPassed = false;
  }

  if (!allPassed) {
    console.log('\n❌ Performance test failed - check thresholds');
    process.exit(1);
  } else {
    console.log('\n✅ All performance tests passed');
  }
});