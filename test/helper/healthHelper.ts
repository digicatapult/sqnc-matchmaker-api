export const responses = {
  ok: (sqncRuntimeVersion: number, ipfsVersion: string, identityVersion: string) => ({
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
        ipfs: {
          status: 'ok',
          detail: {
            version: ipfsVersion,
            peerCount: 1,
          },
        },
        identity: {
          status: 'ok',
          detail: {
            version: identityVersion,
          },
        },
      },
    },
  }),
  ipfsDown: (sqncRuntimeVersion: number, identityVersion: string) => ({
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
        ipfs: {
          status: 'down',
          detail: {
            message: 'Error getting status from IPFS node',
          },
        },
        identity: {
          status: 'ok',
          detail: {
            version: identityVersion,
          },
        },
      },
    },
  }),
}
