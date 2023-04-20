export const serviceState = {
    UP: Symbol('status-up'),
    DOWN: Symbol('status-down'),
    ERROR: Symbol('status-error'),
  }
  
  const stateSymbols: Set<symbol> = new Set(Object.values(serviceState))
  
  const delay = (delayMs: number, result: any) => new Promise((resolve) => setTimeout(resolve, delayMs, result))
  
  const mkStatusGenerator = async function* ({ getStatus, serviceTimeoutMs }: {
    getStatus: any;
    serviceTimeoutMs: any;
}) {
    while (true) {
      try {
        const newStatus = await Promise.race([
          getStatus(),
          delay(serviceTimeoutMs, {
            status: serviceState.DOWN,
            detail: {
              message: 'Timeout fetching status',
            },
          }),
        ])
  
        if (stateSymbols.has(newStatus.status)) {
          yield {
            status: newStatus.status,
            detail: newStatus.detail === undefined ? null : newStatus.detail,
          }
          continue
        }
        throw new Error('Status is not a valid value')
      } catch (err) {
        yield {
          status: serviceState.ERROR,
          detail: null,
        }
      }
    }
  }
  
  export const startStatusHandler = async ({ pollingPeriodMs, serviceTimeoutMs, getStatus }: {
    pollingPeriodMs: any;
    serviceTimeoutMs: any;
    getStatus: any;
    }) => {
    let status: any = null
    const statusGenerator = mkStatusGenerator({ getStatus, serviceTimeoutMs })
    status = (await statusGenerator.next()).value
  
    function delay(ms: number) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }
  
    const statusLoop = async function () {
      await delay(pollingPeriodMs)
      for await (const newStatus of statusGenerator) {
        status = newStatus
        await delay(pollingPeriodMs)
      }
    }
    statusLoop()
  
    return {
      get status() {
        return status.status
      },
      get detail() {
        return status.detail
      },
      close: () => {
        statusGenerator.return
      },
    }
  }
  
  export const buildCombinedHandler = async (handlerMap: any) => {
    const getStatus = () =>
      [...handlerMap].reduce((accStatus, [, h]) => {
        const handlerStatus = h.status
        if (accStatus === serviceState.UP) {
          return handlerStatus
        }
        if (accStatus === serviceState.DOWN) {
          return accStatus
        }
        if (handlerStatus === serviceState.DOWN) {
          return handlerStatus
        }
        return accStatus
      }, serviceState.UP)
  
    return {
      get status() {
        return getStatus()
      },
      get detail() {
        return Object.fromEntries([...handlerMap])
      },
      close: () => {
        for (const handler of handlerMap.values()) {
          handler.close()
        }
      },
    }
  }