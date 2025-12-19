import sinon from 'sinon'

import type { ChangeSet } from '../../changeSet.js'
import type { EventProcessors } from '../../eventProcessor.js'

export const withMockEventProcessors: (result?: ChangeSet) => EventProcessors = (result: ChangeSet = {}) => ({
  demand_create: sinon.stub().returns(result),
  demand_comment: sinon.stub().returns(result),
  match2_propose: sinon.stub().returns(result),
  match2_accept: sinon.stub().returns(result),
  match2_acceptFinal: sinon.stub().returns(result),
  rematch2_acceptFinal: sinon.stub().returns(result),
  match2_reject: sinon.stub().returns(result),
  rematch2_propose: sinon.stub().returns(result),
  match2_cancel: sinon.stub().returns(result),
})
