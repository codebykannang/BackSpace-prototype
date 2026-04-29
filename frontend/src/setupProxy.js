/**
 * setupProxy.js — custom CRA dev proxy config
 *
 * The default CRA proxy times out after 2 minutes.
 * GB-level files split into 19 MB Telegram chunks can take
 * much longer, so we set the timeout to 2 hours.
 */
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:5000',
      changeOrigin: true,
      // 2-hour timeout for both the proxy socket and the upstream connection
      timeout: 7200000,
      proxyTimeout: 7200000,
      // Keep the connection alive while streaming large downloads
      on: {
        error: (err, req, res) => {
          console.error('[proxy error]', err.message);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
          }
          res.end(JSON.stringify({ success: false, error: 'Proxy error: ' + err.message }));
        },
      },
    })
  );
};
