import ChainNode from '../../../src/lib/chainNode.js'
import Indexer from '../../../src/lib/indexer/index.js'
import { UUID } from '../../../src/models/strings.js'
import { Express } from 'express'
import { post } from '../../helper/routeHelper.js'
import Database, { DemandRow } from '../../../src/lib/db/index.js'
import { parametersAttachmentId } from '../../seeds/onchainSeeds/onchain.match2.seed.js'
import { expect } from 'chai'
export type demandAId = {
  originalDemandA: number
  demandA: string
  transactionId: any
}
export type demandBId = {
  originalDemandB: number
  demandB: string
  transactionId: any
}
export async function processDemandAIds(
  numberOfRepeats: number,
  numberIdsPerBlock: number,
  context: {
    app: Express
    indexer: Indexer
  },
  node: ChainNode,
  db: Database
) {
  let res: demandAId[] = []
  for (let i = 0; i < numberOfRepeats; i++) {
    const demandAIdsRes = await Promise.all(
      Array(numberIdsPerBlock)
        .fill(null)
        .map(async () => {
          const {
            body: { id: demandAId },
          } = await post(context.app, '/v1/demandA', { parametersAttachmentId })
          const {
            body: { id: demandATransactionId },
          } = await post(context.app, `/v1/demandA/${demandAId}/creation`, {})
          const [demandA]: DemandRow[] = await db.getDemand(demandAId)

          return {
            originalDemandA: demandA.originalTokenId as number,
            demandA: demandAId as string,
            transactionId: demandATransactionId,
          }
        })
    )

    await node.sealBlock()
    console.log('concatenating A')
    res = res.concat(demandAIdsRes)
  }
  return res
}
export async function processDemandBIds(
  numberOfRepeats: number,
  numberIdsPerBlock: number,
  context: {
    app: Express
    indexer: Indexer
  },
  node: ChainNode,
  db: Database
) {
  let res: demandBId[] = []
  for (let i = 0; i < numberOfRepeats; i++) {
    const demandBIdsRes = await Promise.all(
      Array(numberIdsPerBlock)
        .fill(null)
        .map(async () => {
          const {
            body: { id: demandBId },
          } = await post(context.app, '/v1/demandB', { parametersAttachmentId })
          const {
            body: { id: demandBTransactionId },
          } = await post(context.app, `/v1/demandB/${demandBId}/creation`, {})

          const [demandB]: DemandRow[] = await db.getDemand(demandBId)

          return {
            originalDemandB: demandB.originalTokenId as number,
            demandB: demandBId as string,
            transactionId: demandBTransactionId,
          }
        })
    )
    await node.sealBlock()
    console.log('concatenating B')
    res = res.concat(demandBIdsRes)
  }
  return res
}

export async function processMatches2InChunks(
  demandAs: demandAId[],
  demandBs: demandBId[],
  numberIdsPerBlock: number,
  node: ChainNode,
  context: {
    app: Express
    indexer: Indexer
  },
  match2sToReplace: string[] = []
) {
  let res: string[] = []
  // Split demandAIds and demandBIds into chunks of 100
  const demandAChunks = chunkArray(demandAs, numberIdsPerBlock)
  const demandBChunks = chunkArray(demandBs, numberIdsPerBlock)
  if (demandAChunks.length !== demandBChunks.length) {
    throw new Error('Mismatch between demand A and demand B chunk lengths')
  }
  if (match2sToReplace.length === 0) {
    for (let i = 0; i < demandAChunks.length; i++) {
      const demandAChunk = demandAChunks[i]
      const demandBChunk = demandBChunks[i]

      const match2IdsChunk = await Promise.all(
        demandAChunk.map(async (demandA, index) => {
          const demandB = demandBChunk[index]
          const {
            body: { id: match2Id },
          } = await post(context.app, '/v1/match2', {
            demandA: demandA.demandA,
            demandB: demandB.demandB,
          })
          return match2Id as UUID
        })
      )

      await node.sealBlock()
      console.log('concatenating matches2')
      res = res.concat(match2IdsChunk)
    }
    console.log('number of matches2 created:', res.length)
    return res
  }
  const match2sChunks = chunkArray(match2sToReplace, numberIdsPerBlock)

  for (let i = 0; i < demandAChunks.length; i++) {
    const demandAChunk = demandAChunks[i]
    const demandBChunk = demandBChunks[i]
    const match2Chunk = match2sChunks[i]

    const match2IdsChunk = await Promise.all(
      demandAChunk.map(async (demandA, index) => {
        const demandB = demandBChunk[index]
        const match2ToReplace = match2Chunk[index]
        const {
          body: { id: rematch2Id },
        } = await post(context.app, '/v1/match2', {
          demandA: demandA.demandA,
          demandB: demandB.demandB,
          replaces: match2ToReplace,
        })
        return rematch2Id as UUID
      })
    )

    await node.sealBlock()
    console.log('concatenating matches2')
    res = res.concat(match2IdsChunk)
  }
  console.log('number of matches2 created:', res.length)
  return res
}

export async function processMatch2TransactionsInChunks(
  match2Ids: string[],
  chunkSize: number,
  context: {
    app: Express
    indexer: Indexer
  },
  endpoint: string,
  node: ChainNode,
  status = 201,
  data = {}
): Promise<string[]> {
  const match2Chunks = chunkArray(match2Ids, chunkSize * 0.5)
  console.log(`match2chunks num of arrays  ${match2Chunks.length}`)
  let transactionIds: string[] = []

  for (const chunk of match2Chunks) {
    console.log(`processing chunk ${chunk.length}`)
    const transactionIdsChunk = await Promise.all(
      chunk.map(async (match2Id) => {
        // Submit to chain
        const response = await post(context.app, `/v1/match2/${match2Id}/${endpoint}`, data)
        expect(response.status).to.equal(status)

        const { id: transactionId, state } = response.body
        expect(transactionId).to.match(
          /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89ABab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
        )
        expect(state).to.equal('submitted')

        return transactionId
      })
    )
    await node.sealBlock()

    // Append the transaction IDs from this chunk
    transactionIds = transactionIds.concat(transactionIdsChunk)
  }

  return transactionIds
}

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}
