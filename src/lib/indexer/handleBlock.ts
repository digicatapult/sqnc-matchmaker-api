// eslint-disable-next-line @typescript-eslint/no-unused-vars

import { Logger } from 'pino'
// import Database from '../db'
import ChainNode, { ProcessRanEvent } from '../chainNode'

import defaultEventProcessors, { ValidateProcessName, EventProcessors } from './eventProcessor'
import { ChangeSet, mergeChangeSets } from './changeSet'

export interface BlockHandlerCtorArgs {
  // db: Database
  logger: Logger
  node: ChainNode
  eventProcessors?: EventProcessors
}

export default class BlockHandler {
  private logger: Logger
  // private db: Database
  private node: ChainNode
  private eventProcessors: EventProcessors

  constructor({ logger, node, eventProcessors }: BlockHandlerCtorArgs) {
    this.logger = logger.child({ module: 'blockHandler' })
    // this.db = db
    this.node = node
    this.eventProcessors = eventProcessors || defaultEventProcessors
  }

  public async handleBlock(blockHash: string): Promise<ChangeSet> {
    this.logger.debug('Getting events for block %s', blockHash)
    // find ProcessRan events events
    const events = await this.node.getProcessRanEvents(blockHash)

    // loop over events and handle
    const changeSet = await events.reduce(async (accP: Promise<ChangeSet>, event) => {
      this.logger.debug('ProcessRan event from call %s', event.callHash)
      this.logger.trace('ProcessRan event from call %s details: %j', event.callHash, event)
      const acc = await accP
      return await this.handleEvent(event, acc)
    }, Promise.resolve({}))

    return changeSet
  }

  private async handleEvent(event: ProcessRanEvent, currentChangeSet: ChangeSet) {
    // process changeset for event
    if (!ValidateProcessName(event.process.id)) {
      throw new Error()
    }

    // lookup transaction from call hash in db

    // lookup inputs from db and merge with changeset

    // get output tokens from node

    const eventChangeSet = this.eventProcessors[event.process.id](event.process.version)

    // merge currentChangeSet with eventChangeSet
    const changeSet = mergeChangeSets(currentChangeSet, eventChangeSet)

    return Promise.resolve(changeSet)
  }
}
