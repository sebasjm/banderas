const withOffline = require('next-offline')

module.exports = withOffline({
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
  })
  