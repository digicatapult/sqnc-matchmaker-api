export const responses = {
  ok: (dscpRuntimeVersion: number, ipfsVersion: string) => ({
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
              name: 'dscp',
              versions: {
                authoring: 1,
                impl: 1,
                spec: dscpRuntimeVersion,
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
      },
    },
  }),
  ipfsDown: (dscpRuntimeVersion: number) => ({
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
              name: 'dscp',
              versions: {
                authoring: 1,
                impl: 1,
                spec: dscpRuntimeVersion,
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
      },
    },
  }),
}
