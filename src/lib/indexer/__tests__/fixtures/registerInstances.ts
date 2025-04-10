import sinon from 'sinon'
import { container } from 'tsyringe'
import ChainNode from '../../../chainNode.js'
import { logger, LoggerToken } from '../../../logger.js'
import { EnvToken } from '../../../../env.js'
import Indexer from '../../index.js'
import Attachment from '../../../services/attachment.js'
import { IndexerDatabaseExtensions } from '../../indexerDb.js'

export const registerInstances = (node: ChainNode, db: IndexerDatabaseExtensions, attachment: Attachment) => {
  const env = sinon.stub()
  container.registerInstance(IndexerDatabaseExtensions, db)
  container.registerInstance(ChainNode, node)
  container.registerInstance(Attachment, attachment)
  container.registerInstance(LoggerToken, logger)
  container.registerInstance(EnvToken, env)
  return container.resolve(Indexer)
}
