import sinon from 'sinon'
import ChainNode from 'src/lib/chainNode'

export const withHappyChainNode = () => {
  const getHeader = sinon.spy(async (hash: string) => {
    const number = parseInt(hash, 10)
    return Promise.resolve({
      hash: `${number}-hash`,
      height: number,
      parent: `${number - 1}-hash`,
    })
  })

  const getLastFinalisedBlockHash = sinon.stub().resolves('1-hash')

  return {
    getHeader,
    getLastFinalisedBlockHash,
  } as unknown as ChainNode
}

export const withGetHeaderBoom = (boomOnCallIndex: number) => {
  let callCount = 0
  const getHeader = sinon.spy(async (hash: string) => {
    if (callCount++ === boomOnCallIndex) {
      throw new Error('BOOM')
    }

    const number = parseInt(hash, 10)
    return Promise.resolve({
      hash: `${number}-hash`,
      height: number,
      parent: `${number - 1}-hash`,
    })
  })

  const getLastFinalisedBlockHash = sinon.stub().resolves('1-hash')

  return {
    getHeader,
    getLastFinalisedBlockHash,
  } as unknown as ChainNode
}
