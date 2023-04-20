import { startStatusHandler, serviceState } from '../util/statusPoll'
import { substrateApi } from '../util/substrateApi'
import env from '../env'

const { SUBSTRATE_STATUS_POLL_PERIOD_MS, SUBSTRATE_STATUS_TIMEOUT_MS } = env

const getStatus = async () => {
  await substrateApi.isReadyOrError.catch((error) => {
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
    pollingPeriodMs: SUBSTRATE_STATUS_POLL_PERIOD_MS,
    serviceTimeoutMs: SUBSTRATE_STATUS_TIMEOUT_MS,
  })

export default startApiStatus
