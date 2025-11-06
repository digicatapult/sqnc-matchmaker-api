import { AttachmentRecord, ChangeSet, DemandRecord, MatchRecord, PermissionRecord } from '../../changeSet.js'

export const changeSets2: ChangeSet[] = [
  {
    demands: new Map([['1', { id: '1', type: 'update', latest_token_id: 1, state: 'created' }]]),
    matches: new Map([['2', { id: '2', type: 'update', latest_token_id: 2, state: 'proposed' }]]),
  },
  {
    demands: new Map([
      ['1', { id: '1', type: 'update', latest_token_id: 1, state: 'created' }],
      ['3', { id: '3', type: 'update', latest_token_id: 3, state: 'created' }],
    ]),
    matches: new Map([
      ['2', { id: '2', type: 'update', latest_token_id: 2, state: 'proposed' }],
      ['4', { id: '4', type: 'update', latest_token_id: 4, state: 'proposed' }],
    ]),
  },
]

export const findIdTestSet: ChangeSet = {
  attachments: new Map<string, AttachmentRecord>([
    [
      '0x01',
      {
        id: '0x01',
        integrityHash: '01',
        type: 'insert',
        ownerAddress: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      },
    ],
  ]),
  demands: new Map<string, DemandRecord>([
    [
      '0x02',
      {
        type: 'update',
        id: '0x02',
        state: 'created',
        latest_token_id: 42,
      },
    ],
  ]),
  matches: new Map<string, MatchRecord>([
    [
      '0x03',
      {
        type: 'update',
        id: '0x03',
        state: 'proposed',
        latest_token_id: 43,
      },
    ],
    [
      '0x04',
      {
        type: 'update',
        id: '0x04',
        state: 'proposed',
        latest_token_id: 44,
      },
    ],
  ]),
  permissions: new Map<string, PermissionRecord>([
    ['0x05', { type: 'delete', id: '0x05' }],
    [
      '0x06',
      { type: 'insert', id: '0x06', latest_token_id: 45, original_token_id: 45, owner: 'alice', scope: 'member_a' },
    ],
  ]),
}
