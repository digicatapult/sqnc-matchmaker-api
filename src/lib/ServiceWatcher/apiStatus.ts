import { startStatusHandler, serviceState } from '../util/statusPoll'
import { substrateApi } from '../util/substrateApi'
import env from '../../env'

const { WATCHER_POLL_PERIOD_MS, WATCHER_TIMEOUT_MS } = env

const getStatus = async () => {
  await substrateApi.isReadyOrError.catch((error: any) => {
    return error
  })
  if (!substrateApi.isConnected) {
    return {
      status: serviceState.DOWN,
      detail: {
        message: 'Cannot connect to substrate node',
      },
    }
  }
  const [chain, runtime] = await Promise.all([substrateApi.runtimeChain, substrateApi.runtimeVersion])
  return {
    status: serviceState.UP,
    detail: {
      chain,
      runtime: {
        name: runtime.specName,
        versions: {
          spec: runtime.specVersion.toNumber(),
          impl: runtime.implVersion.toNumber(),
          authoring: runtime.authoringVersion.toNumber(),
          transaction: runtime.transactionVersion.toNumber(),
        },
      },
    },
  }
}

const startApiStatus = () =>
  startStatusHandler({
    getStatus,
    pollingPeriodMs: WATCHER_POLL_PERIOD_MS,
    serviceTimeoutMs: WATCHER_TIMEOUT_MS,
  })

export default startApiStatus
