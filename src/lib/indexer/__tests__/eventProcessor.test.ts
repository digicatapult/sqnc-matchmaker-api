import { describe, it } from 'mocha'

import eventProcessors from '../eventProcessor'
import { expect } from 'chai'
import { Transaction } from '../../db'
import { ChangeSet } from '../changeSet'

describe('eventProcessor', function () {
  describe('demand-create', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['demand-create'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should return update to demand if transaction exists', function () {
      const result = eventProcessors['demand-create'](
        1,
        { localId: '42' } as Transaction,
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

    it("should return new attachment and demand if transaction doesn't exist", function () {
      const result = eventProcessors['demand-create'](
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
        ipfs_hash: 'a',
      })

      expect(result.demands?.size).to.equal(1)
      const [[demandId, demand]] = [...(result.demands || [])]
      expect(demand).to.deep.equal({
        type: 'insert',
        id: demandId,
        owner: '123',
        subtype: 'demand_b',
        state: 'created',
        parameters_attachment_id: attachmentId,
        latest_token_id: 1,
        original_token_id: 1,
      })
    })
  })

  describe('demand-comment', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['demand-comment'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should return update to demand and demandComment if transaction exists', function () {
      const result = eventProcessors['demand-comment'](
        1,
        { localId: '42', id: '10' } as Transaction,
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
      const result = eventProcessors['demand-comment'](
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
        ipfs_hash: 'a',
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
        attachment: attachmentId,
      })
    })
  })

  describe('match2-propose', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2-propose'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should return update to demand if transaction exists', function () {
      const result = eventProcessors['match2-propose'](
        1,
        { localId: 'id_42' } as Transaction,
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

    it('should return update to demands and new match if transaction does not exist', function () {
      const result = eventProcessors['match2-propose'](
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
              ['membera', 'a'],
              ['memberb', 'b'],
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
      })
    })
  })

  describe('match2-accept', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2-accept'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should update the state of the match2 to match output', function () {
      const result = eventProcessors['match2-accept'](
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

  describe('match2-acceptFinal', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2-acceptFinal'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should update the states of the match2 and demands', function () {
      const result = eventProcessors['match2-acceptFinal'](
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

  describe('match2-reject', function () {
    it('should error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2-reject'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('should update the state of the match2 to match output', function () {
      const result = eventProcessors['match2-reject'](1, null, 'alice', [{ id: 1, localId: 'id_1' }], [])

      expect(result).to.deep.equal({
        matches: new Map([['id_1', { type: 'update', id: 'id_1', state: 'rejected' }]]),
      })
    })
  })

  describe('match2-cancel', function () {
    let cancelResult: ChangeSet
    describe('if transaction already exists', () => {
      beforeEach(() => {
        cancelResult = eventProcessors['match2-cancel'](
          1,
          { localId: 'id_3', id: 'transaction_id' } as Transaction,
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
                ['state', 'cncelled'],
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

      it('and updates a match2-comment usig transaction id', () => {
        const { match2Comments } = cancelResult

        expect(match2Comments).to.deep.equal(
          new Map([['transaction_id', { type: 'update', state: 'created', transaction_id: 'transaction_id' }]])
        )
      })
    })

    it('returns error with version != 1', function () {
      let error: Error | null = null
      try {
        eventProcessors['match2-cancel'](0, null, 'alice', [], [])
      } catch (err) {
        error = err instanceof Error ? err : null
      }
      expect(error).instanceOf(Error)
    })

    it('updates the states of the match2 and demands and inserts attachment with a comment', () => {
      const result = eventProcessors['match2-cancel'](
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
