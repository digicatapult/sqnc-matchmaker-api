import { describe, it } from 'mocha'
import { expect } from 'chai'

import eventProcessors from '../eventProcessor.js'
import { TransactionRow } from '../../db/types.js'
import { ChangeSet } from '../changeSet.js'

describe('eventProcessor', function () {
  describe('permission_create', function () {
    it('should error with version != 1/2', function () {
      let error: Error | null = null
      try {
        eventProcessors['permission_create'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should insert new permission', function () {
      const result = eventProcessors['permission_create'](
        1,
        null,
        'alice',
        [],
        [{ id: 1, roles: new Map([['owner', 'alice']]), metadata: new Map([['scope', 'member_a']]) }]
      )

      expect(result.permissions?.size).to.equal(1)
      const [[permissionId, permission]] = [...(result.permissions || [])]
      expect(permission).to.deep.equal({
        type: 'insert',
        id: permissionId,
        original_token_id: 1,
        latest_token_id: 1,
        owner: 'alice',
        scope: 'member_a',
      })
    })
  })

  describe('permission_destroy', function () {
    it('should error with version != 1/2', function () {
      let error: Error | null = null
      try {
        eventProcessors['permission_destroy'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should delete permission', function () {
      const result = eventProcessors['permission_destroy'](1, null, 'alice', [{ id: 1, localId: '123' }], [])

      expect(result).to.deep.equal({
        permissions: new Map([
          [
            '123',
            {
              type: 'delete',
              id: '123',
            },
          ],
        ]),
      })
    })
  })

  describe('demand_create', function () {
    it('should error with version != 1/2', function () {
      let error: Error | null = null
      try {
        eventProcessors['demand_create'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should return update to demand if transaction exists (version 1)', function () {
      const result = eventProcessors['demand_create'](
        1,
        { local_id: '42' } as TransactionRow,
        'alice',
        [],
        [{ id: 1, roles: new Map(), metadata: new Map() }]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['42', { type: 'update', id: '42', state: 'created', latest_token_id: 1, original_token_id: 1 }],
        ]),
      })
    })

    it('should return update to demand if transaction exists (version 2)', function () {
      const result = eventProcessors['demand_create'](
        2,
        { local_id: '42' } as TransactionRow,
        'alice',
        [{ id: 42, localId: '123' }],
        [{ id: 1, roles: new Map(), metadata: new Map() }]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['42', { type: 'update', id: '42', state: 'created', latest_token_id: 1, original_token_id: 1 }],
        ]),
      })
    })

    it("should return new attachment and demand if transaction doesn't exist (version 1)", function () {
      const result = eventProcessors['demand_create'](
        1,
        null,
        'alice',
        [],
        [
          {
            id: 1,
            roles: new Map([['owner', '123']]),
            metadata: new Map([
              ['parameters', 'a'],
              ['subtype', 'demand_b'],
            ]),
          },
        ]
      )

      expect(result.attachments?.size).to.equal(1)
      const [[attachmentId, attachment]] = [...(result.attachments || [])]
      expect(attachment).to.deep.equal({
        type: 'insert',
        id: attachmentId,
        integrityHash: 'a',
        ownerAddress: 'alice',
      })

      expect(result.demands?.size).to.equal(1)
      const [[demandId, demand]] = [...(result.demands || [])]
      expect(demand).to.deep.equal({
        type: 'insert',
        id: demandId,
        owner: '123',
        subtype: 'demand_b',
        state: 'created',
        parameters_attachment_id: attachment.id,
        latest_token_id: 1,
        original_token_id: 1,
      })
    })

    it("should return new attachment and demand if transaction doesn't exist (version 2)", function () {
      const result = eventProcessors['demand_create'](
        2,
        null,
        'alice',
        [{ id: 42, localId: '123' }],
        [
          {
            id: 1,
            roles: new Map([['owner', '123']]),
            metadata: new Map([
              ['parameters', 'a'],
              ['subtype', 'demand_b'],
            ]),
          },
        ]
      )

      expect(result.attachments?.size).to.equal(1)
      const [[attachmentId, attachment]] = [...(result.attachments || [])]
      expect(attachment).to.deep.equal({
        type: 'insert',
        id: attachmentId,
        integrityHash: 'a',
        ownerAddress: 'alice',
      })

      expect(result.demands?.size).to.equal(1)
      const [[demandId, demand]] = [...(result.demands || [])]
      expect(demand).to.deep.equal({
        type: 'insert',
        id: demandId,
        owner: '123',
        subtype: 'demand_b',
        state: 'created',
        parameters_attachment_id: attachment.id,
        latest_token_id: 1,
        original_token_id: 1,
      })
    })
  })

  describe('demand_comment', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['demand_comment'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should return update to demand and demandComment if transaction exists', function () {
      const result = eventProcessors['demand_comment'](
        1,
        { local_id: '42', id: '10' } as TransactionRow,
        'alice',
        [{ id: 1, localId: '42' }],
        [{ id: 2, roles: new Map(), metadata: new Map([['state', 'allocated']]) }]
      )

      expect(result).to.deep.equal({
        demands: new Map([['42', { type: 'update', id: '42', state: 'allocated', latest_token_id: 2 }]]),
        demandComments: new Map([['10', { type: 'update', transaction_id: '10', state: 'created' }]]),
      })
    })

    it("should return new attachment, new comment and update demand if transaction doesn't exist", function () {
      const result = eventProcessors['demand_comment'](
        1,
        null,
        'alice',
        [{ id: 1, localId: '42' }],
        [
          {
            id: 2,
            roles: new Map(),
            metadata: new Map([
              ['state', 'allocated'],
              ['comment', 'a'],
            ]),
          },
        ]
      )

      expect(result.attachments?.size).to.equal(1)
      const [[attachmentId, attachment]] = [...(result.attachments || [])]
      expect(attachment).to.deep.equal({
        type: 'insert',
        id: attachmentId,
        integrityHash: 'a',
        ownerAddress: 'alice',
      })

      expect(result.demands?.size).to.equal(1)
      const [[demandId, demand]] = [...(result.demands || [])]
      expect(demandId).to.equal('42')
      expect(demand).to.deep.equal({ type: 'update', id: '42', state: 'allocated', latest_token_id: 2 })

      expect(result.demandComments?.size).to.equal(1)
      const [[commentId, comment]] = [...(result.demandComments || [])]
      expect(comment).to.deep.equal({
        type: 'insert',
        id: commentId,
        state: 'created',
        demand: demandId,
        owner: 'alice',
        attachment_id: attachment.id,
        transaction_id: null,
      })
    })
  })

  describe('match2_propose', function () {
    it('should error with version != 1/2', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2_propose'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should return update to demand if transaction exists (version 1)', function () {
      const result = eventProcessors['match2_propose'](
        1,
        { local_id: 'id_42' } as TransactionRow,
        'alice',
        [
          { id: 1, localId: 'id_1' },
          { id: 2, localId: 'id_2' },
        ],
        [
          { id: 3, roles: new Map(), metadata: new Map() },
          { id: 4, roles: new Map(), metadata: new Map() },
          { id: 5, roles: new Map(), metadata: new Map() },
        ]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'created', latest_token_id: 3 }],
          ['id_2', { type: 'update', id: 'id_2', state: 'created', latest_token_id: 4 }],
        ]),
        matches: new Map([
          ['id_42', { type: 'update', id: 'id_42', state: 'proposed', latest_token_id: 5, original_token_id: 5 }],
        ]),
      })
    })

    it('should return update to demands and new match if transaction does not exist (version 1)', function () {
      const result = eventProcessors['match2_propose'](
        1,
        null,
        'alice',
        [
          { id: 1, localId: 'id_1' },
          { id: 2, localId: 'id_2' },
        ],
        [
          { id: 3, roles: new Map(), metadata: new Map() },
          { id: 4, roles: new Map(), metadata: new Map() },
          {
            id: 5,
            roles: new Map([
              ['optimiser', 'o'],
              ['member_a', 'a'],
              ['member_b', 'b'],
            ]),
            metadata: new Map([
              ['demandA', 'da'],
              ['demandB', 'db'],
            ]),
          },
        ]
      )

      expect(result.demands).to.deep.equal(
        new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'created', latest_token_id: 3 }],
          ['id_2', { type: 'update', id: 'id_2', state: 'created', latest_token_id: 4 }],
        ])
      )

      expect(result.matches?.size).to.equal(1)
      const [[matchId, match]] = [...(result.matches || [])]
      expect(match).to.deep.equal({
        type: 'insert',
        id: matchId,
        optimiser: 'o',
        member_a: 'a',
        member_b: 'b',
        state: 'proposed',
        demand_a_id: 'id_1',
        demand_b_id: 'id_2',
        latest_token_id: 5,
        original_token_id: 5,
        replaces_id: null,
      })
    })

    it('should return update to demand if transaction exists (version 2)', function () {
      const result = eventProcessors['match2_propose'](
        2,
        { local_id: 'id_42' } as TransactionRow,
        'alice',
        [
          { id: 42, localId: '123' },
          { id: 1, localId: 'id_1' },
          { id: 2, localId: 'id_2' },
        ],
        [{ id: 5, roles: new Map(), metadata: new Map() }]
      )

      expect(result).to.deep.equal({
        demands: undefined,
        matches: new Map([
          ['id_42', { type: 'update', id: 'id_42', state: 'proposed', latest_token_id: 5, original_token_id: 5 }],
        ]),
      })
    })

    it('should return update to demands and new match if transaction does not exist (version 2)', function () {
      const result = eventProcessors['match2_propose'](
        2,
        null,
        'alice',
        [
          { id: 42, localId: '123' },
          { id: 1, localId: 'id_1' },
          { id: 2, localId: 'id_2' },
        ],
        [
          {
            id: 5,
            roles: new Map([
              ['optimiser', 'o'],
              ['member_a', 'a'],
              ['member_b', 'b'],
            ]),
            metadata: new Map([
              ['demandA', 'da'],
              ['demandB', 'db'],
            ]),
          },
        ]
      )

      expect(result.demands).to.equal(undefined)

      expect(result.matches?.size).to.equal(1)
      const [[matchId, match]] = [...(result.matches || [])]
      expect(match).to.deep.equal({
        type: 'insert',
        id: matchId,
        optimiser: 'o',
        member_a: 'a',
        member_b: 'b',
        state: 'proposed',
        demand_a_id: 'id_1',
        demand_b_id: 'id_2',
        latest_token_id: 5,
        original_token_id: 5,
        replaces_id: null,
      })
    })
  })

  describe('rematch2_propose', function () {
    it('should error with version != 1/2', function () {
      let error: Error | null = null
      try {
        eventProcessors['rematch2_propose'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should return update to demand if transaction exists  (version 1)', function () {
      const result = eventProcessors['rematch2_propose'](
        1,
        { local_id: 'id_42' } as TransactionRow,
        'alice',
        [
          { id: 1, localId: 'id_1' }, //demandA
          { id: 2, localId: 'id_2' }, //old match2
          { id: 3, localId: 'id_3' }, //new demandB
        ],
        [
          { id: 4, roles: new Map(), metadata: new Map() }, //demandA
          { id: 5, roles: new Map(), metadata: new Map() }, //old match2
          { id: 6, roles: new Map(), metadata: new Map() }, //new demandB
          { id: 7, roles: new Map(), metadata: new Map() }, //new match2
        ]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'allocated', latest_token_id: 4 }], //demandA
          ['id_3', { type: 'update', id: 'id_3', state: 'created', latest_token_id: 6 }], //new DemandB
        ]),
        matches: new Map([
          ['id_2', { type: 'update', id: 'id_2', state: 'acceptedFinal', latest_token_id: 5 }], //old match2
          ['id_42', { type: 'update', id: 'id_42', state: 'proposed', latest_token_id: 7, original_token_id: 7 }], //new match2
        ]),
      })
    })

    it('should return update to demands and new match if transaction does not exist (version 1)', function () {
      const result = eventProcessors['rematch2_propose'](
        1,
        null,
        'alice',
        [
          { id: 1, localId: 'id_1' }, //demandA
          { id: 2, localId: 'id_2' }, //old match2
          { id: 3, localId: 'id_3' }, //new demandB
        ],
        [
          { id: 4, roles: new Map(), metadata: new Map() }, //demandA
          { id: 5, roles: new Map(), metadata: new Map() }, //old match2
          { id: 6, roles: new Map(), metadata: new Map() }, //new demandB
          {
            id: 7,
            roles: new Map([
              ['optimiser', 'o'],
              ['member_a', 'a'],
              ['member_b', 'b'],
            ]),
            metadata: new Map([
              ['demandA', 'da'],
              ['demandB', 'db'],
            ]),
          }, //new match2
        ]
      )
      expect(result.demands).to.deep.equal(
        new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'allocated', latest_token_id: 4 }], //demandA
          ['id_3', { type: 'update', id: 'id_3', state: 'created', latest_token_id: 6 }], //new DemandB
        ])
      )

      expect(result.matches?.size).to.equal(2)
      const [[oldMatchId, oldMatch], [newMatch2Id, newMatch2]] = [...(result.matches || [])]
      expect(newMatch2).to.deep.equal({
        type: 'insert',
        id: newMatch2Id,
        optimiser: 'o',
        member_a: 'a',
        member_b: 'b',
        state: 'proposed',
        demand_a_id: 'id_1',
        demand_b_id: 'id_3',
        latest_token_id: 7,
        original_token_id: 7,
        replaces_id: 'id_2',
      })
      expect(oldMatch).to.deep.equal({
        type: 'update',
        id: oldMatchId,
        state: 'acceptedFinal',
        latest_token_id: 5,
      })
    })

    it('should return update to demand if transaction exists (version 2)', function () {
      const result = eventProcessors['rematch2_propose'](
        2,
        { local_id: 'id_42' } as TransactionRow,
        'alice',
        [
          { id: 42, localId: '123' }, //permission
          { id: 1, localId: 'id_1' }, //demandA
          { id: 2, localId: 'id_2' }, //old match2
          { id: 3, localId: 'id_3' }, //new demandB
        ],
        [
          { id: 7, roles: new Map(), metadata: new Map() }, //new match2
        ]
      )

      expect(result).to.deep.equal({
        demands: undefined,
        matches: new Map([
          ['id_42', { type: 'update', id: 'id_42', state: 'proposed', latest_token_id: 7, original_token_id: 7 }], //new match2
        ]),
      })
    })

    it('should return update to demands and new match if transaction does not exist (version 2)', function () {
      const result = eventProcessors['rematch2_propose'](
        2,
        null,
        'alice',
        [
          { id: 42, localId: '123' }, //permission
          { id: 1, localId: 'id_1' }, //demandA
          { id: 2, localId: 'id_2' }, //old match2
          { id: 3, localId: 'id_3' }, //new demandB
        ],
        [
          {
            id: 7,
            roles: new Map([
              ['optimiser', 'o'],
              ['member_a', 'a'],
              ['member_b', 'b'],
            ]),
            metadata: new Map([
              ['demandA', 'da'],
              ['demandB', 'db'],
            ]),
          }, //new match2
        ]
      )
      expect(result.demands).to.equal(undefined)

      expect(result.matches?.size).to.equal(1)
      const [[newMatch2Id, newMatch2]] = [...(result.matches || [])]
      expect(newMatch2).to.deep.equal({
        type: 'insert',
        id: newMatch2Id,
        optimiser: 'o',
        member_a: 'a',
        member_b: 'b',
        state: 'proposed',
        demand_a_id: 'id_1',
        demand_b_id: 'id_3',
        latest_token_id: 7,
        original_token_id: 7,
        replaces_id: 'id_2',
      })
    })
  })
  describe('match2_accept', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2_accept'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should update the state of the match2 to match output', function () {
      const result = eventProcessors['match2_accept'](
        1,
        null,
        'alice',
        [{ id: 1, localId: 'id_1' }],
        [{ id: 2, roles: new Map(), metadata: new Map([['state', 'acceptedA']]) }]
      )

      expect(result).to.deep.equal({
        matches: new Map([['id_1', { type: 'update', id: 'id_1', state: 'acceptedA', latest_token_id: 2 }]]),
      })
    })
  })

  describe('match2_acceptFinal', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2_acceptFinal'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should update the states of the match2 and demands', function () {
      const result = eventProcessors['match2_acceptFinal'](
        1,
        null,
        'alice',
        [
          { id: 1, localId: 'id_1' },
          { id: 2, localId: 'id_2' },
          { id: 3, localId: 'id_3' },
        ],
        [
          { id: 4, roles: new Map(), metadata: new Map() },
          { id: 5, roles: new Map(), metadata: new Map() },
          { id: 6, roles: new Map(), metadata: new Map() },
        ]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'allocated', latest_token_id: 4 }],
          ['id_2', { type: 'update', id: 'id_2', state: 'allocated', latest_token_id: 5 }],
        ]),
        matches: new Map([['id_3', { type: 'update', id: 'id_3', state: 'acceptedFinal', latest_token_id: 6 }]]),
      })
    })
  })
  describe('rematch2_acceptFinal', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['rematch2_acceptFinal'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should update the states of the two match2s and all three demands (version 1)', function () {
      const result = eventProcessors['rematch2_acceptFinal'](
        1,
        null,
        'alice',
        [
          { id: 1, localId: 'id_1' }, //demandA
          { id: 2, localId: 'id_2' }, //oldDemandB
          { id: 3, localId: 'id_3' }, //oldMatch2
          { id: 4, localId: 'id_4' }, //newDemandB
          { id: 5, localId: 'id_5' }, //newMatch2
        ],
        [
          { id: 6, roles: new Map(), metadata: new Map() }, //demandA
          { id: 7, roles: new Map(), metadata: new Map() }, //oldDemandB
          { id: 8, roles: new Map(), metadata: new Map() }, //oldMatch2
          { id: 9, roles: new Map(), metadata: new Map() }, //newDemandB
          { id: 10, roles: new Map(), metadata: new Map() }, //newMatch2
        ]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'allocated', latest_token_id: 6 }], //demandA
          ['id_2', { type: 'update', id: 'id_2', state: 'cancelled', latest_token_id: 7 }], //oldDemandB
          ['id_4', { type: 'update', id: 'id_4', state: 'allocated', latest_token_id: 9 }], //newDemandB
        ]),
        matches: new Map([
          ['id_3', { type: 'update', id: 'id_3', state: 'cancelled', latest_token_id: 8 }], //oldMatch2
          ['id_5', { type: 'update', id: 'id_5', state: 'acceptedFinal', latest_token_id: 10 }], //newMatch2
        ]),
      })
    })

    it('should update the states of the two match2s and both new demands (version 2)', function () {
      const result = eventProcessors['rematch2_acceptFinal'](
        2,
        null,
        'alice',
        [
          { id: 1, localId: 'id_1' }, //demandA
          { id: 2, localId: 'id_2' }, //oldDemandB
          { id: 3, localId: 'id_3' }, //oldMatch2
          { id: 4, localId: 'id_4' }, //newDemandB
          { id: 5, localId: 'id_5' }, //newMatch2
        ],
        [
          { id: 7, roles: new Map(), metadata: new Map() }, //oldDemandB
          { id: 8, roles: new Map(), metadata: new Map() }, //oldMatch2
          { id: 9, roles: new Map(), metadata: new Map() }, //newDemandB
          { id: 10, roles: new Map(), metadata: new Map() }, //newMatch2
        ]
      )

      expect(result).to.deep.equal({
        demands: new Map([
          ['id_2', { type: 'update', id: 'id_2', state: 'cancelled', latest_token_id: 7 }], //oldDemandB
          ['id_4', { type: 'update', id: 'id_4', state: 'allocated', latest_token_id: 9 }], //newDemandB
        ]),
        matches: new Map([
          ['id_3', { type: 'update', id: 'id_3', state: 'cancelled', latest_token_id: 8 }], //oldMatch2
          ['id_5', { type: 'update', id: 'id_5', state: 'acceptedFinal', latest_token_id: 10 }], //newMatch2
        ]),
      })
    })
  })

  describe('match2_reject', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2_reject'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should update the state of the match2 to match output', function () {
      const result = eventProcessors['match2_reject'](1, null, 'alice', [{ id: 1, localId: 'id_1' }], [])

      expect(result).to.deep.equal({
        matches: new Map([['id_1', { type: 'update', id: 'id_1', state: 'rejected' }]]),
      })
    })
  })

  describe('match2_cancel', () => {
    let cancelResult: ChangeSet

    describe('if transaction already exists', () => {
      beforeEach(() => {
        cancelResult = eventProcessors['match2_cancel'](
          1,
          { local_id: 'id_3', id: 'transaction_id' } as TransactionRow,
          'alice',
          [
            { id: 1, localId: 'demandA_id' },
            { id: 2, localId: 'demandB_id' },
            { id: 3, localId: 'match2_id' },
          ],
          [
            { id: 4, roles: new Map(), metadata: new Map() },
            { id: 5, roles: new Map(), metadata: new Map() },
            {
              id: 6,
              roles: new Map(),
              metadata: new Map([
                ['state', 'cancelled'],
                ['comment', 'existing_transaction'],
              ]),
            },
          ]
        )
      })

      it('does not insert attachment and returns [matches, demands, match2Comments]', () => {
        expect(cancelResult).to.not.have.keys(['attachment'])
        expect(cancelResult).to.have.keys(['matches', 'demands', 'match2Comments'])
      })

      it('updates demands and existing match2 with cancelled state', () => {
        const { matches, demands } = cancelResult

        expect(matches).to.deep.equal(
          new Map([['match2_id', { type: 'update', id: 'match2_id', state: 'cancelled', latest_token_id: 6 }]])
        )
        expect(demands).to.deep.equal(
          new Map([
            ['demandA_id', { type: 'update', id: 'demandA_id', state: 'cancelled', latest_token_id: 4 }],
            ['demandB_id', { type: 'update', id: 'demandB_id', state: 'cancelled', latest_token_id: 5 }],
          ])
        )
      })

      it('and updates a match2_comment using transaction id', () => {
        const { match2Comments } = cancelResult

        expect(match2Comments).to.deep.equal(
          new Map([['transaction_id', { type: 'update', state: 'created', transaction_id: 'transaction_id' }]])
        )
      })
    })

    it('returns error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2_cancel'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('updates the states of the match2 and demands and inserts attachment with a comment', () => {
      const result = eventProcessors['match2_cancel'](
        1,
        null,
        'alice',
        [
          { id: 1, localId: 'id_1' },
          { id: 2, localId: 'id_2' },
          { id: 3, localId: 'id_3' },
        ],
        [
          { id: 4, roles: new Map(), metadata: new Map() },
          { id: 5, roles: new Map(), metadata: new Map() },
          {
            id: 6,
            roles: new Map(),
            metadata: new Map([
              ['state', 'cncelled'],
              ['comment', 'transaction-is-null'],
            ]),
          },
        ]
      )

      expect(result).to.have.keys(['matches', 'demands', 'match2Comments', 'attachments'])
      expect(result).to.deep.contain({
        demands: new Map([
          ['id_1', { type: 'update', id: 'id_1', state: 'cancelled', latest_token_id: 4 }],
          ['id_2', { type: 'update', id: 'id_2', state: 'cancelled', latest_token_id: 5 }],
        ]),
        matches: new Map([['id_3', { type: 'update', id: 'id_3', state: 'cancelled', latest_token_id: 6 }]]),
      })
    })
  })
})
