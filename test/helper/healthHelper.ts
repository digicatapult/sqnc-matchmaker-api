export const responses = {
  ok: (
    sqncRuntimeVersion: number,
    attachmentVersion: string,
    identityVersion: string,
    indexerStatus: string,
    startupTime: Date,
    latestActivityTime: Date
  ) => ({
    code: 200,
    body: {
      status: 'ok',
      version: process.env.npm_package_version,
      details: {
        api: {
          status: 'ok',
          detail: {
            chain: 'Development',
            runtime: {
              name: 'sqnc',
              versions: {
                authoring: 1,
                impl: 1,
                spec: sqncRuntimeVersion,
                transaction: 1,
              },
            },
          },
        },
        attachment: {
          status: 'ok',
          detail: {
            version: attachmentVersion,
          },
        },
        identity: {
          status: 'ok',
          detail: {
            version: identityVersion,
          },
        },
        indexer: {
          status: indexerStatus,
          detail: {
            message: 'Service healthy. Starting up.',
            latestActivityTime: latestActivityTime,
            startupTime: startupTime,
          },
        },
      },
    },
  }),

  attachmentDown: (
    sqncRuntimeVersion: number,
    attachmentVersion: string,
    identityVersion: string,
    indexerStatus: string,
    startupTime: Date,
    latestActivityTime: Date
  ) => ({
    code: 503,
    body: {
      status: 'down',
      version: process.env.npm_package_version,
      details: {
        api: {
          status: 'ok',
          detail: {
            chain: 'Development',
            runtime: {
              name: 'sqnc',
              versions: {
                authoring: 1,
                impl: 1,
                spec: sqncRuntimeVersion,
                transaction: 1,
              },
            },
          },
        },
        attachment: {
          status: 'down',
          detail: {
            version: attachmentVersion,
          },
        },
        identity: {
          status: 'ok',
          detail: {
            version: identityVersion,
          },
        },
        indexer: {
          status: indexerStatus,
          detail: {
            message: 'Service healthy. Starting up.',
            latestActivityTime: latestActivityTime,
            startupTime: startupTime,
          },
        },
      },
    },
  }),
}
