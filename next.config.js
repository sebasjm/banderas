const withOffline = require('next-offline')
const { PHASE_PRODUCTION_SERVER } =
  process.env.NODE_ENV === 'development'
    ? {} // We're never in "production server" phase when in development mode
    : !process.env.NOW_REGION 
      ? require('next/constants') // Get values from `next` package when building locally
      : require('next-server/constants'); // Get values from `next-server` package when building on now v2

module.exports = (phase, { defaultConfig }) => {
  if (phase === PHASE_PRODUCTION_SERVER) {
    // Config used to run in production.
    return {};
  }

  const withCSS = require('@zeit/next-css');

  return withCSS(withOffline({
    target: "serverless",
    workboxOpts: {
      importWorkboxFrom: 'local',
      runtimeCaching: [{
          urlPattern: /\.(?:png|mp3|svg)$/,
          handler: 'cacheFirst',
          options: {
            cacheName: 'assets',
            expiration: {
              maxEntries: 666,
              maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
            }
          }
        },{
          urlPattern: /\.js$|\.json$|/,
          handler: 'staleWhileRevalidate',
          options: {
            cacheName: 'pages',
            expiration: {
              maxEntries: 666,
              maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
            }
          }
        }
      ]
    }
  }));
};

