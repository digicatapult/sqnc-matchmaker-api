import sinon from 'sinon'
import { container } from 'tsyringe'
import ChainNode from '../../../chainNode.js'
import { logger, LoggerToken } from '../../../logger.js'
import { EnvToken } from '../../../../env.js'
import Database from '../../../db/index.js'
import Indexer from '../../index.js'

export const registerInstances = (node: ChainNode, db: Database) => {
  const env = sinon.stub()
  container.registerInstance(Database, db)
  container.registerInstance(ChainNode, node)
  container.registerInstance(LoggerToken, logger)
  container.registerInstance(EnvToken, env)
  return container.resolve(Indexer)
}
