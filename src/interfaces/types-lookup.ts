// Auto-generated via `yarn polkadot-types-from-defs`, do not edit
/* eslint-disable */

// import type lookup before we augment - in some environments
// this is required to allow for ambient/previous definitions
import '@polkadot/types/lookup';

import type { BTreeMap, Bytes, Compact, Enum, Null, Option, Result, Struct, Text, U8aFixed, Vec, bool, u128, u32, u64, u8 } from '@polkadot/types-codec';
import type { ITuple } from '@polkadot/types-codec/types';
import type { OpaquePeerId } from '@polkadot/types/interfaces/imOnline';
import type { AccountId32, Call, H256, MultiAddress } from '@polkadot/types/interfaces/runtime';
import type { Event } from '@polkadot/types/interfaces/system';

declare module '@polkadot/types/lookup' {
  /** @name FrameSystemAccountInfo (3) */
  interface FrameSystemAccountInfo extends Struct {
    readonly nonce: u32;
    readonly consumers: u32;
    readonly providers: u32;
    readonly sufficients: u32;
    readonly data: PalletBalancesAccountData;
  }

  /** @name PalletBalancesAccountData (5) */
  interface PalletBalancesAccountData extends Struct {
    readonly free: u128;
    readonly reserved: u128;
    readonly miscFrozen: u128;
    readonly feeFrozen: u128;
  }

  /** @name FrameSupportDispatchPerDispatchClassWeight (7) */
  interface FrameSupportDispatchPerDispatchClassWeight extends Struct {
    readonly normal: SpWeightsWeightV2Weight;
    readonly operational: SpWeightsWeightV2Weight;
    readonly mandatory: SpWeightsWeightV2Weight;
  }

  /** @name SpWeightsWeightV2Weight (8) */
  interface SpWeightsWeightV2Weight extends Struct {
    readonly refTime: Compact<u64>;
    readonly proofSize: Compact<u64>;
  }

  /** @name SpRuntimeDigest (13) */
  interface SpRuntimeDigest extends Struct {
    readonly logs: Vec<SpRuntimeDigestDigestItem>;
  }

  /** @name SpRuntimeDigestDigestItem (15) */
  interface SpRuntimeDigestDigestItem extends Enum {
    readonly isOther: boolean;
    readonly asOther: Bytes;
    readonly isConsensus: boolean;
    readonly asConsensus: ITuple<[U8aFixed, Bytes]>;
    readonly isSeal: boolean;
    readonly asSeal: ITuple<[U8aFixed, Bytes]>;
    readonly isPreRuntime: boolean;
    readonly asPreRuntime: ITuple<[U8aFixed, Bytes]>;
    readonly isRuntimeEnvironmentUpdated: boolean;
    readonly type: 'Other' | 'Consensus' | 'Seal' | 'PreRuntime' | 'RuntimeEnvironmentUpdated';
  }

  /** @name FrameSystemEventRecord (18) */
  interface FrameSystemEventRecord extends Struct {
    readonly phase: FrameSystemPhase;
    readonly event: Event;
    readonly topics: Vec<H256>;
  }

  /** @name FrameSystemEvent (20) */
  interface FrameSystemEvent extends Enum {
    readonly isExtrinsicSuccess: boolean;
    readonly asExtrinsicSuccess: {
      readonly dispatchInfo: FrameSupportDispatchDispatchInfo;
    } & Struct;
    readonly isExtrinsicFailed: boolean;
    readonly asExtrinsicFailed: {
      readonly dispatchError: SpRuntimeDispatchError;
      readonly dispatchInfo: FrameSupportDispatchDispatchInfo;
    } & Struct;
    readonly isCodeUpdated: boolean;
    readonly isNewAccount: boolean;
    readonly asNewAccount: {
      readonly account: AccountId32;
    } & Struct;
    readonly isKilledAccount: boolean;
    readonly asKilledAccount: {
      readonly account: AccountId32;
    } & Struct;
    readonly isRemarked: boolean;
    readonly asRemarked: {
      readonly sender: AccountId32;
      readonly hash_: H256;
    } & Struct;
    readonly type: 'ExtrinsicSuccess' | 'ExtrinsicFailed' | 'CodeUpdated' | 'NewAccount' | 'KilledAccount' | 'Remarked';
  }

  /** @name FrameSupportDispatchDispatchInfo (21) */
  interface FrameSupportDispatchDispatchInfo extends Struct {
    readonly weight: SpWeightsWeightV2Weight;
    readonly class: FrameSupportDispatchDispatchClass;
    readonly paysFee: FrameSupportDispatchPays;
  }

  /** @name FrameSupportDispatchDispatchClass (22) */
  interface FrameSupportDispatchDispatchClass extends Enum {
    readonly isNormal: boolean;
    readonly isOperational: boolean;
    readonly isMandatory: boolean;
    readonly type: 'Normal' | 'Operational' | 'Mandatory';
  }

  /** @name FrameSupportDispatchPays (23) */
  interface FrameSupportDispatchPays extends Enum {
    readonly isYes: boolean;
    readonly isNo: boolean;
    readonly type: 'Yes' | 'No';
  }

  /** @name SpRuntimeDispatchError (24) */
  interface SpRuntimeDispatchError extends Enum {
    readonly isOther: boolean;
    readonly isCannotLookup: boolean;
    readonly isBadOrigin: boolean;
    readonly isModule: boolean;
    readonly asModule: SpRuntimeModuleError;
    readonly isConsumerRemaining: boolean;
    readonly isNoProviders: boolean;
    readonly isTooManyConsumers: boolean;
    readonly isToken: boolean;
    readonly asToken: SpRuntimeTokenError;
    readonly isArithmetic: boolean;
    readonly asArithmetic: SpArithmeticArithmeticError;
    readonly isTransactional: boolean;
    readonly asTransactional: SpRuntimeTransactionalError;
    readonly isExhausted: boolean;
    readonly isCorruption: boolean;
    readonly isUnavailable: boolean;
    readonly type: 'Other' | 'CannotLookup' | 'BadOrigin' | 'Module' | 'ConsumerRemaining' | 'NoProviders' | 'TooManyConsumers' | 'Token' | 'Arithmetic' | 'Transactional' | 'Exhausted' | 'Corruption' | 'Unavailable';
  }

  /** @name SpRuntimeModuleError (25) */
  interface SpRuntimeModuleError extends Struct {
    readonly index: u8;
    readonly error: U8aFixed;
  }

  /** @name SpRuntimeTokenError (26) */
  interface SpRuntimeTokenError extends Enum {
    readonly isNoFunds: boolean;
    readonly isWouldDie: boolean;
    readonly isBelowMinimum: boolean;
    readonly isCannotCreate: boolean;
    readonly isUnknownAsset: boolean;
    readonly isFrozen: boolean;
    readonly isUnsupported: boolean;
    readonly type: 'NoFunds' | 'WouldDie' | 'BelowMinimum' | 'CannotCreate' | 'UnknownAsset' | 'Frozen' | 'Unsupported';
  }

  /** @name SpArithmeticArithmeticError (27) */
  interface SpArithmeticArithmeticError extends Enum {
    readonly isUnderflow: boolean;
    readonly isOverflow: boolean;
    readonly isDivisionByZero: boolean;
    readonly type: 'Underflow' | 'Overflow' | 'DivisionByZero';
  }

  /** @name SpRuntimeTransactionalError (28) */
  interface SpRuntimeTransactionalError extends Enum {
    readonly isLimitReached: boolean;
    readonly isNoLayer: boolean;
    readonly type: 'LimitReached' | 'NoLayer';
  }

  /** @name PalletGrandpaEvent (29) */
  interface PalletGrandpaEvent extends Enum {
    readonly isNewAuthorities: boolean;
    readonly asNewAuthorities: {
      readonly authoritySet: Vec<ITuple<[SpFinalityGrandpaAppPublic, u64]>>;
    } & Struct;
    readonly isPaused: boolean;
    readonly isResumed: boolean;
    readonly type: 'NewAuthorities' | 'Paused' | 'Resumed';
  }

  /** @name SpFinalityGrandpaAppPublic (32) */
  interface SpFinalityGrandpaAppPublic extends SpCoreEd25519Public {}

  /** @name SpCoreEd25519Public (33) */
  interface SpCoreEd25519Public extends U8aFixed {}

  /** @name PalletBalancesEvent (34) */
  interface PalletBalancesEvent extends Enum {
    readonly isEndowed: boolean;
    readonly asEndowed: {
      readonly account: AccountId32;
      readonly freeBalance: u128;
    } & Struct;
    readonly isDustLost: boolean;
    readonly asDustLost: {
      readonly account: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly from: AccountId32;
      readonly to: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isBalanceSet: boolean;
    readonly asBalanceSet: {
      readonly who: AccountId32;
      readonly free: u128;
      readonly reserved: u128;
    } & Struct;
    readonly isReserved: boolean;
    readonly asReserved: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isUnreserved: boolean;
    readonly asUnreserved: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isReserveRepatriated: boolean;
    readonly asReserveRepatriated: {
      readonly from: AccountId32;
      readonly to: AccountId32;
      readonly amount: u128;
      readonly destinationStatus: FrameSupportTokensMiscBalanceStatus;
    } & Struct;
    readonly isDeposit: boolean;
    readonly asDeposit: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isWithdraw: boolean;
    readonly asWithdraw: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly isSlashed: boolean;
    readonly asSlashed: {
      readonly who: AccountId32;
      readonly amount: u128;
    } & Struct;
    readonly type: 'Endowed' | 'DustLost' | 'Transfer' | 'BalanceSet' | 'Reserved' | 'Unreserved' | 'ReserveRepatriated' | 'Deposit' | 'Withdraw' | 'Slashed';
  }

  /** @name FrameSupportTokensMiscBalanceStatus (35) */
  interface FrameSupportTokensMiscBalanceStatus extends Enum {
    readonly isFree: boolean;
    readonly isReserved: boolean;
    readonly type: 'Free' | 'Reserved';
  }

  /** @name PalletSudoEvent (36) */
  interface PalletSudoEvent extends Enum {
    readonly isSudid: boolean;
    readonly asSudid: {
      readonly sudoResult: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly isKeyChanged: boolean;
    readonly asKeyChanged: {
      readonly oldSudoer: Option<AccountId32>;
    } & Struct;
    readonly isSudoAsDone: boolean;
    readonly asSudoAsDone: {
      readonly sudoResult: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly type: 'Sudid' | 'KeyChanged' | 'SudoAsDone';
  }

  /** @name PalletSimpleNftEvent (40) */
  interface PalletSimpleNftEvent extends Enum {
    readonly isMinted: boolean;
    readonly asMinted: ITuple<[u128, AccountId32, Vec<u128>]>;
    readonly isBurnt: boolean;
    readonly asBurnt: ITuple<[u128, AccountId32, Vec<u128>]>;
    readonly type: 'Minted' | 'Burnt';
  }

  /** @name PalletProcessValidationEvent (43) */
  interface PalletProcessValidationEvent extends Enum {
    readonly isProcessCreated: boolean;
    readonly asProcessCreated: ITuple<[Bytes, u32, Vec<PalletProcessValidationBinaryExpressionTreeBooleanExpressionSymbol>, bool]>;
    readonly isProcessDisabled: boolean;
    readonly asProcessDisabled: ITuple<[Bytes, u32]>;
    readonly type: 'ProcessCreated' | 'ProcessDisabled';
  }

  /** @name PalletProcessValidationBinaryExpressionTreeBooleanExpressionSymbol (46) */
  interface PalletProcessValidationBinaryExpressionTreeBooleanExpressionSymbol extends Enum {
    readonly isOp: boolean;
    readonly asOp: PalletProcessValidationBinaryExpressionTreeBooleanOperator;
    readonly isRestriction: boolean;
    readonly asRestriction: PalletProcessValidationRestrictionsRestriction;
    readonly type: 'Op' | 'Restriction';
  }

  /** @name DscpNodeRuntimeRole (47) */
  interface DscpNodeRuntimeRole extends Enum {
    readonly isOwner: boolean;
    readonly isCustomer: boolean;
    readonly isAdditiveManufacturer: boolean;
    readonly isLaboratory: boolean;
    readonly isBuyer: boolean;
    readonly isSupplier: boolean;
    readonly isReviewer: boolean;
    readonly isOptimiser: boolean;
    readonly isMemberA: boolean;
    readonly isMemberB: boolean;
    readonly type: 'Owner' | 'Customer' | 'AdditiveManufacturer' | 'Laboratory' | 'Buyer' | 'Supplier' | 'Reviewer' | 'Optimiser' | 'MemberA' | 'MemberB';
  }

  /** @name DscpNodeRuntimeMetadataValue (48) */
  interface DscpNodeRuntimeMetadataValue extends Enum {
    readonly isFile: boolean;
    readonly asFile: H256;
    readonly isLiteral: boolean;
    readonly asLiteral: Bytes;
    readonly isTokenId: boolean;
    readonly asTokenId: u128;
    readonly isNone: boolean;
    readonly type: 'File' | 'Literal' | 'TokenId' | 'None';
  }

  /** @name DscpNodeRuntimeMetadataValueType (49) */
  interface DscpNodeRuntimeMetadataValueType extends Enum {
    readonly isFile: boolean;
    readonly isLiteral: boolean;
    readonly isTokenId: boolean;
    readonly isNone: boolean;
    readonly type: 'File' | 'Literal' | 'TokenId' | 'None';
  }

  /** @name PalletProcessValidationBinaryExpressionTreeBooleanOperator (50) */
  interface PalletProcessValidationBinaryExpressionTreeBooleanOperator extends Enum {
    readonly isNull: boolean;
    readonly isIdentity: boolean;
    readonly isTransferL: boolean;
    readonly isTransferR: boolean;
    readonly isNotL: boolean;
    readonly isNotR: boolean;
    readonly isAnd: boolean;
    readonly isNand: boolean;
    readonly isOr: boolean;
    readonly isNor: boolean;
    readonly isXor: boolean;
    readonly isXnor: boolean;
    readonly isImplicationL: boolean;
    readonly isImplicationR: boolean;
    readonly isInhibitionL: boolean;
    readonly isInhibitionR: boolean;
    readonly type: 'Null' | 'Identity' | 'TransferL' | 'TransferR' | 'NotL' | 'NotR' | 'And' | 'Nand' | 'Or' | 'Nor' | 'Xor' | 'Xnor' | 'ImplicationL' | 'ImplicationR' | 'InhibitionL' | 'InhibitionR';
  }

  /** @name PalletProcessValidationRestrictionsRestriction (51) */
  interface PalletProcessValidationRestrictionsRestriction extends Enum {
    readonly isNone: boolean;
    readonly isFail: boolean;
    readonly isSenderHasInputRole: boolean;
    readonly asSenderHasInputRole: {
      readonly index: u32;
      readonly roleKey: DscpNodeRuntimeRole;
    } & Struct;
    readonly isSenderHasOutputRole: boolean;
    readonly asSenderHasOutputRole: {
      readonly index: u32;
      readonly roleKey: DscpNodeRuntimeRole;
    } & Struct;
    readonly isOutputHasRole: boolean;
    readonly asOutputHasRole: {
      readonly index: u32;
      readonly roleKey: DscpNodeRuntimeRole;
    } & Struct;
    readonly isOutputHasMetadata: boolean;
    readonly asOutputHasMetadata: {
      readonly index: u32;
      readonly metadataKey: Bytes;
    } & Struct;
    readonly isInputHasRole: boolean;
    readonly asInputHasRole: {
      readonly index: u32;
      readonly roleKey: DscpNodeRuntimeRole;
    } & Struct;
    readonly isInputHasMetadata: boolean;
    readonly asInputHasMetadata: {
      readonly index: u32;
      readonly metadataKey: Bytes;
    } & Struct;
    readonly isMatchInputOutputRole: boolean;
    readonly asMatchInputOutputRole: {
      readonly inputIndex: u32;
      readonly inputRoleKey: DscpNodeRuntimeRole;
      readonly outputIndex: u32;
      readonly outputRoleKey: DscpNodeRuntimeRole;
    } & Struct;
    readonly isMatchInputOutputMetadataValue: boolean;
    readonly asMatchInputOutputMetadataValue: {
      readonly inputIndex: u32;
      readonly inputMetadataKey: Bytes;
      readonly outputIndex: u32;
      readonly outputMetadataKey: Bytes;
    } & Struct;
    readonly isMatchInputIdOutputMetadataValue: boolean;
    readonly asMatchInputIdOutputMetadataValue: {
      readonly inputIndex: u32;
      readonly outputIndex: u32;
      readonly outputMetadataKey: Bytes;
    } & Struct;
    readonly isFixedNumberOfInputs: boolean;
    readonly asFixedNumberOfInputs: {
      readonly numInputs: u32;
    } & Struct;
    readonly isFixedNumberOfOutputs: boolean;
    readonly asFixedNumberOfOutputs: {
      readonly numOutputs: u32;
    } & Struct;
    readonly isFixedInputMetadataValue: boolean;
    readonly asFixedInputMetadataValue: {
      readonly index: u32;
      readonly metadataKey: Bytes;
      readonly metadataValue: DscpNodeRuntimeMetadataValue;
    } & Struct;
    readonly isFixedOutputMetadataValue: boolean;
    readonly asFixedOutputMetadataValue: {
      readonly index: u32;
      readonly metadataKey: Bytes;
      readonly metadataValue: DscpNodeRuntimeMetadataValue;
    } & Struct;
    readonly isFixedOutputMetadataValueType: boolean;
    readonly asFixedOutputMetadataValueType: {
      readonly index: u32;
      readonly metadataKey: Bytes;
      readonly metadataValueType: DscpNodeRuntimeMetadataValueType;
    } & Struct;
    readonly type: 'None' | 'Fail' | 'SenderHasInputRole' | 'SenderHasOutputRole' | 'OutputHasRole' | 'OutputHasMetadata' | 'InputHasRole' | 'InputHasMetadata' | 'MatchInputOutputRole' | 'MatchInputOutputMetadataValue' | 'MatchInputIdOutputMetadataValue' | 'FixedNumberOfInputs' | 'FixedNumberOfOutputs' | 'FixedInputMetadataValue' | 'FixedOutputMetadataValue' | 'FixedOutputMetadataValueType';
  }

  /** @name PalletNodeAuthorizationEvent (54) */
  interface PalletNodeAuthorizationEvent extends Enum {
    readonly isNodeAdded: boolean;
    readonly asNodeAdded: {
      readonly peerId: OpaquePeerId;
      readonly who: AccountId32;
    } & Struct;
    readonly isNodeRemoved: boolean;
    readonly asNodeRemoved: {
      readonly peerId: OpaquePeerId;
    } & Struct;
    readonly isNodeSwapped: boolean;
    readonly asNodeSwapped: {
      readonly removed: OpaquePeerId;
      readonly added: OpaquePeerId;
    } & Struct;
    readonly isNodesReset: boolean;
    readonly asNodesReset: {
      readonly nodes: Vec<ITuple<[OpaquePeerId, AccountId32]>>;
    } & Struct;
    readonly isNodeClaimed: boolean;
    readonly asNodeClaimed: {
      readonly peerId: OpaquePeerId;
      readonly who: AccountId32;
    } & Struct;
    readonly isClaimRemoved: boolean;
    readonly asClaimRemoved: {
      readonly peerId: OpaquePeerId;
      readonly who: AccountId32;
    } & Struct;
    readonly isNodeTransferred: boolean;
    readonly asNodeTransferred: {
      readonly peerId: OpaquePeerId;
      readonly target: AccountId32;
    } & Struct;
    readonly isConnectionsAdded: boolean;
    readonly asConnectionsAdded: {
      readonly peerId: OpaquePeerId;
      readonly allowedConnections: Vec<OpaquePeerId>;
    } & Struct;
    readonly isConnectionsRemoved: boolean;
    readonly asConnectionsRemoved: {
      readonly peerId: OpaquePeerId;
      readonly allowedConnections: Vec<OpaquePeerId>;
    } & Struct;
    readonly type: 'NodeAdded' | 'NodeRemoved' | 'NodeSwapped' | 'NodesReset' | 'NodeClaimed' | 'ClaimRemoved' | 'NodeTransferred' | 'ConnectionsAdded' | 'ConnectionsRemoved';
  }

  /** @name PalletPreimageEvent (59) */
  interface PalletPreimageEvent extends Enum {
    readonly isNoted: boolean;
    readonly asNoted: {
      readonly hash_: H256;
    } & Struct;
    readonly isRequested: boolean;
    readonly asRequested: {
      readonly hash_: H256;
    } & Struct;
    readonly isCleared: boolean;
    readonly asCleared: {
      readonly hash_: H256;
    } & Struct;
    readonly type: 'Noted' | 'Requested' | 'Cleared';
  }

  /** @name PalletSchedulerEvent (60) */
  interface PalletSchedulerEvent extends Enum {
    readonly isScheduled: boolean;
    readonly asScheduled: {
      readonly when: u32;
      readonly index: u32;
    } & Struct;
    readonly isCanceled: boolean;
    readonly asCanceled: {
      readonly when: u32;
      readonly index: u32;
    } & Struct;
    readonly isDispatched: boolean;
    readonly asDispatched: {
      readonly task: ITuple<[u32, u32]>;
      readonly id: Option<U8aFixed>;
      readonly result: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly isCallUnavailable: boolean;
    readonly asCallUnavailable: {
      readonly task: ITuple<[u32, u32]>;
      readonly id: Option<U8aFixed>;
    } & Struct;
    readonly isPeriodicFailed: boolean;
    readonly asPeriodicFailed: {
      readonly task: ITuple<[u32, u32]>;
      readonly id: Option<U8aFixed>;
    } & Struct;
    readonly isPermanentlyOverweight: boolean;
    readonly asPermanentlyOverweight: {
      readonly task: ITuple<[u32, u32]>;
      readonly id: Option<U8aFixed>;
    } & Struct;
    readonly type: 'Scheduled' | 'Canceled' | 'Dispatched' | 'CallUnavailable' | 'PeriodicFailed' | 'PermanentlyOverweight';
  }

  /** @name PalletSymmetricKeyEvent (63) */
  interface PalletSymmetricKeyEvent extends Enum {
    readonly isUpdateKey: boolean;
    readonly asUpdateKey: Bytes;
    readonly type: 'UpdateKey';
  }

  /** @name PalletMembershipEvent (65) */
  interface PalletMembershipEvent extends Enum {
    readonly isMemberAdded: boolean;
    readonly isMemberRemoved: boolean;
    readonly isMembersSwapped: boolean;
    readonly isMembersReset: boolean;
    readonly isKeyChanged: boolean;
    readonly isDummy: boolean;
    readonly type: 'MemberAdded' | 'MemberRemoved' | 'MembersSwapped' | 'MembersReset' | 'KeyChanged' | 'Dummy';
  }

  /** @name PalletCollectiveEvent (66) */
  interface PalletCollectiveEvent extends Enum {
    readonly isProposed: boolean;
    readonly asProposed: {
      readonly account: AccountId32;
      readonly proposalIndex: u32;
      readonly proposalHash: H256;
      readonly threshold: u32;
    } & Struct;
    readonly isVoted: boolean;
    readonly asVoted: {
      readonly account: AccountId32;
      readonly proposalHash: H256;
      readonly voted: bool;
      readonly yes: u32;
      readonly no: u32;
    } & Struct;
    readonly isApproved: boolean;
    readonly asApproved: {
      readonly proposalHash: H256;
    } & Struct;
    readonly isDisapproved: boolean;
    readonly asDisapproved: {
      readonly proposalHash: H256;
    } & Struct;
    readonly isExecuted: boolean;
    readonly asExecuted: {
      readonly proposalHash: H256;
      readonly result: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly isMemberExecuted: boolean;
    readonly asMemberExecuted: {
      readonly proposalHash: H256;
      readonly result: Result<Null, SpRuntimeDispatchError>;
    } & Struct;
    readonly isClosed: boolean;
    readonly asClosed: {
      readonly proposalHash: H256;
      readonly yes: u32;
      readonly no: u32;
    } & Struct;
    readonly type: 'Proposed' | 'Voted' | 'Approved' | 'Disapproved' | 'Executed' | 'MemberExecuted' | 'Closed';
  }

  /** @name PalletDoasEvent (67) */
  interface PalletDoasEvent extends Enum {
    readonly isDidAsRoot: boolean;
    readonly asDidAsRoot: Result<Null, SpRuntimeDispatchError>;
    readonly isDidAs: boolean;
    readonly asDidAs: Result<Null, SpRuntimeDispatchError>;
    readonly type: 'DidAsRoot' | 'DidAs';
  }

  /** @name FrameSystemPhase (68) */
  interface FrameSystemPhase extends Enum {
    readonly isApplyExtrinsic: boolean;
    readonly asApplyExtrinsic: u32;
    readonly isFinalization: boolean;
    readonly isInitialization: boolean;
    readonly type: 'ApplyExtrinsic' | 'Finalization' | 'Initialization';
  }

  /** @name FrameSystemLastRuntimeUpgradeInfo (71) */
  interface FrameSystemLastRuntimeUpgradeInfo extends Struct {
    readonly specVersion: Compact<u32>;
    readonly specName: Text;
  }

  /** @name FrameSystemCall (74) */
  interface FrameSystemCall extends Enum {
    readonly isRemark: boolean;
    readonly asRemark: {
      readonly remark: Bytes;
    } & Struct;
    readonly isSetHeapPages: boolean;
    readonly asSetHeapPages: {
      readonly pages: u64;
    } & Struct;
    readonly isSetCode: boolean;
    readonly asSetCode: {
      readonly code: Bytes;
    } & Struct;
    readonly isSetCodeWithoutChecks: boolean;
    readonly asSetCodeWithoutChecks: {
      readonly code: Bytes;
    } & Struct;
    readonly isSetStorage: boolean;
    readonly asSetStorage: {
      readonly items: Vec<ITuple<[Bytes, Bytes]>>;
    } & Struct;
    readonly isKillStorage: boolean;
    readonly asKillStorage: {
      readonly keys_: Vec<Bytes>;
    } & Struct;
    readonly isKillPrefix: boolean;
    readonly asKillPrefix: {
      readonly prefix: Bytes;
      readonly subkeys: u32;
    } & Struct;
    readonly isRemarkWithEvent: boolean;
    readonly asRemarkWithEvent: {
      readonly remark: Bytes;
    } & Struct;
    readonly type: 'Remark' | 'SetHeapPages' | 'SetCode' | 'SetCodeWithoutChecks' | 'SetStorage' | 'KillStorage' | 'KillPrefix' | 'RemarkWithEvent';
  }

  /** @name FrameSystemLimitsBlockWeights (78) */
  interface FrameSystemLimitsBlockWeights extends Struct {
    readonly baseBlock: SpWeightsWeightV2Weight;
    readonly maxBlock: SpWeightsWeightV2Weight;
    readonly perClass: FrameSupportDispatchPerDispatchClassWeightsPerClass;
  }

  /** @name FrameSupportDispatchPerDispatchClassWeightsPerClass (79) */
  interface FrameSupportDispatchPerDispatchClassWeightsPerClass extends Struct {
    readonly normal: FrameSystemLimitsWeightsPerClass;
    readonly operational: FrameSystemLimitsWeightsPerClass;
    readonly mandatory: FrameSystemLimitsWeightsPerClass;
  }

  /** @name FrameSystemLimitsWeightsPerClass (80) */
  interface FrameSystemLimitsWeightsPerClass extends Struct {
    readonly baseExtrinsic: SpWeightsWeightV2Weight;
    readonly maxExtrinsic: Option<SpWeightsWeightV2Weight>;
    readonly maxTotal: Option<SpWeightsWeightV2Weight>;
    readonly reserved: Option<SpWeightsWeightV2Weight>;
  }

  /** @name FrameSystemLimitsBlockLength (82) */
  interface FrameSystemLimitsBlockLength extends Struct {
    readonly max: FrameSupportDispatchPerDispatchClassU32;
  }

  /** @name FrameSupportDispatchPerDispatchClassU32 (83) */
  interface FrameSupportDispatchPerDispatchClassU32 extends Struct {
    readonly normal: u32;
    readonly operational: u32;
    readonly mandatory: u32;
  }

  /** @name SpWeightsRuntimeDbWeight (84) */
  interface SpWeightsRuntimeDbWeight extends Struct {
    readonly read: u64;
    readonly write: u64;
  }

  /** @name SpVersionRuntimeVersion (85) */
  interface SpVersionRuntimeVersion extends Struct {
    readonly specName: Text;
    readonly implName: Text;
    readonly authoringVersion: u32;
    readonly specVersion: u32;
    readonly implVersion: u32;
    readonly apis: Vec<ITuple<[U8aFixed, u32]>>;
    readonly transactionVersion: u32;
    readonly stateVersion: u8;
  }

  /** @name FrameSystemError (91) */
  interface FrameSystemError extends Enum {
    readonly isInvalidSpecName: boolean;
    readonly isSpecVersionNeedsToIncrease: boolean;
    readonly isFailedToExtractRuntimeVersion: boolean;
    readonly isNonDefaultComposite: boolean;
    readonly isNonZeroRefCount: boolean;
    readonly isCallFiltered: boolean;
    readonly type: 'InvalidSpecName' | 'SpecVersionNeedsToIncrease' | 'FailedToExtractRuntimeVersion' | 'NonDefaultComposite' | 'NonZeroRefCount' | 'CallFiltered';
  }

  /** @name PalletTimestampCall (93) */
  interface PalletTimestampCall extends Enum {
    readonly isSet: boolean;
    readonly asSet: {
      readonly now: Compact<u64>;
    } & Struct;
    readonly type: 'Set';
  }

  /** @name SpConsensusAuraSr25519AppSr25519Public (95) */
  interface SpConsensusAuraSr25519AppSr25519Public extends SpCoreSr25519Public {}

  /** @name SpCoreSr25519Public (96) */
  interface SpCoreSr25519Public extends U8aFixed {}

  /** @name PalletGrandpaStoredState (99) */
  interface PalletGrandpaStoredState extends Enum {
    readonly isLive: boolean;
    readonly isPendingPause: boolean;
    readonly asPendingPause: {
      readonly scheduledAt: u32;
      readonly delay: u32;
    } & Struct;
    readonly isPaused: boolean;
    readonly isPendingResume: boolean;
    readonly asPendingResume: {
      readonly scheduledAt: u32;
      readonly delay: u32;
    } & Struct;
    readonly type: 'Live' | 'PendingPause' | 'Paused' | 'PendingResume';
  }

  /** @name PalletGrandpaStoredPendingChange (100) */
  interface PalletGrandpaStoredPendingChange extends Struct {
    readonly scheduledAt: u32;
    readonly delay: u32;
    readonly nextAuthorities: Vec<ITuple<[SpFinalityGrandpaAppPublic, u64]>>;
    readonly forced: Option<u32>;
  }

  /** @name PalletGrandpaCall (103) */
  interface PalletGrandpaCall extends Enum {
    readonly isReportEquivocation: boolean;
    readonly asReportEquivocation: {
      readonly equivocationProof: SpFinalityGrandpaEquivocationProof;
      readonly keyOwnerProof: SpCoreVoid;
    } & Struct;
    readonly isReportEquivocationUnsigned: boolean;
    readonly asReportEquivocationUnsigned: {
      readonly equivocationProof: SpFinalityGrandpaEquivocationProof;
      readonly keyOwnerProof: SpCoreVoid;
    } & Struct;
    readonly isNoteStalled: boolean;
    readonly asNoteStalled: {
      readonly delay: u32;
      readonly bestFinalizedBlockNumber: u32;
    } & Struct;
    readonly type: 'ReportEquivocation' | 'ReportEquivocationUnsigned' | 'NoteStalled';
  }

  /** @name SpFinalityGrandpaEquivocationProof (104) */
  interface SpFinalityGrandpaEquivocationProof extends Struct {
    readonly setId: u64;
    readonly equivocation: SpFinalityGrandpaEquivocation;
  }

  /** @name SpFinalityGrandpaEquivocation (105) */
  interface SpFinalityGrandpaEquivocation extends Enum {
    readonly isPrevote: boolean;
    readonly asPrevote: FinalityGrandpaEquivocationPrevote;
    readonly isPrecommit: boolean;
    readonly asPrecommit: FinalityGrandpaEquivocationPrecommit;
    readonly type: 'Prevote' | 'Precommit';
  }

  /** @name FinalityGrandpaEquivocationPrevote (106) */
  interface FinalityGrandpaEquivocationPrevote extends Struct {
    readonly roundNumber: u64;
    readonly identity: SpFinalityGrandpaAppPublic;
    readonly first: ITuple<[FinalityGrandpaPrevote, SpFinalityGrandpaAppSignature]>;
    readonly second: ITuple<[FinalityGrandpaPrevote, SpFinalityGrandpaAppSignature]>;
  }

  /** @name FinalityGrandpaPrevote (107) */
  interface FinalityGrandpaPrevote extends Struct {
    readonly targetHash: H256;
    readonly targetNumber: u32;
  }

  /** @name SpFinalityGrandpaAppSignature (108) */
  interface SpFinalityGrandpaAppSignature extends SpCoreEd25519Signature {}

  /** @name SpCoreEd25519Signature (109) */
  interface SpCoreEd25519Signature extends U8aFixed {}

  /** @name FinalityGrandpaEquivocationPrecommit (112) */
  interface FinalityGrandpaEquivocationPrecommit extends Struct {
    readonly roundNumber: u64;
    readonly identity: SpFinalityGrandpaAppPublic;
    readonly first: ITuple<[FinalityGrandpaPrecommit, SpFinalityGrandpaAppSignature]>;
    readonly second: ITuple<[FinalityGrandpaPrecommit, SpFinalityGrandpaAppSignature]>;
  }

  /** @name FinalityGrandpaPrecommit (113) */
  interface FinalityGrandpaPrecommit extends Struct {
    readonly targetHash: H256;
    readonly targetNumber: u32;
  }

  /** @name SpCoreVoid (115) */
  type SpCoreVoid = Null;

  /** @name PalletGrandpaError (116) */
  interface PalletGrandpaError extends Enum {
    readonly isPauseFailed: boolean;
    readonly isResumeFailed: boolean;
    readonly isChangePending: boolean;
    readonly isTooSoon: boolean;
    readonly isInvalidKeyOwnershipProof: boolean;
    readonly isInvalidEquivocationProof: boolean;
    readonly isDuplicateOffenceReport: boolean;
    readonly type: 'PauseFailed' | 'ResumeFailed' | 'ChangePending' | 'TooSoon' | 'InvalidKeyOwnershipProof' | 'InvalidEquivocationProof' | 'DuplicateOffenceReport';
  }

  /** @name PalletBalancesBalanceLock (118) */
  interface PalletBalancesBalanceLock extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
    readonly reasons: PalletBalancesReasons;
  }

  /** @name PalletBalancesReasons (119) */
  interface PalletBalancesReasons extends Enum {
    readonly isFee: boolean;
    readonly isMisc: boolean;
    readonly isAll: boolean;
    readonly type: 'Fee' | 'Misc' | 'All';
  }

  /** @name PalletBalancesReserveData (122) */
  interface PalletBalancesReserveData extends Struct {
    readonly id: U8aFixed;
    readonly amount: u128;
  }

  /** @name PalletBalancesCall (124) */
  interface PalletBalancesCall extends Enum {
    readonly isTransfer: boolean;
    readonly asTransfer: {
      readonly dest: MultiAddress;
      readonly value: Compact<u128>;
    } & Struct;
    readonly isSetBalance: boolean;
    readonly asSetBalance: {
      readonly who: MultiAddress;
      readonly newFree: Compact<u128>;
      readonly newReserved: Compact<u128>;
    } & Struct;
    readonly isForceTransfer: boolean;
    readonly asForceTransfer: {
      readonly source: MultiAddress;
      readonly dest: MultiAddress;
      readonly value: Compact<u128>;
    } & Struct;
    readonly isTransferKeepAlive: boolean;
    readonly asTransferKeepAlive: {
      readonly dest: MultiAddress;
      readonly value: Compact<u128>;
    } & Struct;
    readonly isTransferAll: boolean;
    readonly asTransferAll: {
      readonly dest: MultiAddress;
      readonly keepAlive: bool;
    } & Struct;
    readonly isForceUnreserve: boolean;
    readonly asForceUnreserve: {
      readonly who: MultiAddress;
      readonly amount: u128;
    } & Struct;
    readonly type: 'Transfer' | 'SetBalance' | 'ForceTransfer' | 'TransferKeepAlive' | 'TransferAll' | 'ForceUnreserve';
  }

  /** @name PalletBalancesError (129) */
  interface PalletBalancesError extends Enum {
    readonly isVestingBalance: boolean;
    readonly isLiquidityRestrictions: boolean;
    readonly isInsufficientBalance: boolean;
    readonly isExistentialDeposit: boolean;
    readonly isKeepAlive: boolean;
    readonly isExistingVestingSchedule: boolean;
    readonly isDeadAccount: boolean;
    readonly isTooManyReserves: boolean;
    readonly type: 'VestingBalance' | 'LiquidityRestrictions' | 'InsufficientBalance' | 'ExistentialDeposit' | 'KeepAlive' | 'ExistingVestingSchedule' | 'DeadAccount' | 'TooManyReserves';
  }

  /** @name PalletTransactionPaymentFreeCall (130) */
  type PalletTransactionPaymentFreeCall = Null;

  /** @name PalletSudoCall (131) */
  interface PalletSudoCall extends Enum {
    readonly isSudo: boolean;
    readonly asSudo: {
      readonly call: Call;
    } & Struct;
    readonly isSudoUncheckedWeight: boolean;
    readonly asSudoUncheckedWeight: {
      readonly call: Call;
      readonly weight: SpWeightsWeightV2Weight;
    } & Struct;
    readonly isSetKey: boolean;
    readonly asSetKey: {
      readonly new_: MultiAddress;
    } & Struct;
    readonly isSudoAs: boolean;
    readonly asSudoAs: {
      readonly who: MultiAddress;
      readonly call: Call;
    } & Struct;
    readonly type: 'Sudo' | 'SudoUncheckedWeight' | 'SetKey' | 'SudoAs';
  }

  /** @name PalletSimpleNftCall (133) */
  interface PalletSimpleNftCall extends Enum {
    readonly isRunProcess: boolean;
    readonly asRunProcess: {
      readonly process: DscpPalletTraitsProcessFullyQualifiedId;
      readonly inputs: Vec<u128>;
      readonly outputs: Vec<PalletSimpleNftOutput>;
    } & Struct;
    readonly type: 'RunProcess';
  }

  /** @name DscpPalletTraitsProcessFullyQualifiedId (134) */
  interface DscpPalletTraitsProcessFullyQualifiedId extends Struct {
    readonly id: Bytes;
    readonly version: u32;
  }

  /** @name PalletSimpleNftOutput (136) */
  interface PalletSimpleNftOutput extends Struct {
    readonly roles: BTreeMap<DscpNodeRuntimeRole, AccountId32>;
    readonly metadata: BTreeMap<Bytes, DscpNodeRuntimeMetadataValue>;
  }

  /** @name PalletProcessValidationCall (146) */
  interface PalletProcessValidationCall extends Enum {
    readonly isCreateProcess: boolean;
    readonly asCreateProcess: {
      readonly id: Bytes;
      readonly program: Vec<PalletProcessValidationBinaryExpressionTreeBooleanExpressionSymbol>;
    } & Struct;
    readonly isDisableProcess: boolean;
    readonly asDisableProcess: {
      readonly id: Bytes;
      readonly version: u32;
    } & Struct;
    readonly type: 'CreateProcess' | 'DisableProcess';
  }

  /** @name PalletNodeAuthorizationCall (147) */
  interface PalletNodeAuthorizationCall extends Enum {
    readonly isAddWellKnownNode: boolean;
    readonly asAddWellKnownNode: {
      readonly node: OpaquePeerId;
      readonly owner: MultiAddress;
    } & Struct;
    readonly isRemoveWellKnownNode: boolean;
    readonly asRemoveWellKnownNode: {
      readonly node: OpaquePeerId;
    } & Struct;
    readonly isSwapWellKnownNode: boolean;
    readonly asSwapWellKnownNode: {
      readonly remove: OpaquePeerId;
      readonly add: OpaquePeerId;
    } & Struct;
    readonly isResetWellKnownNodes: boolean;
    readonly asResetWellKnownNodes: {
      readonly nodes: Vec<ITuple<[OpaquePeerId, AccountId32]>>;
    } & Struct;
    readonly isClaimNode: boolean;
    readonly asClaimNode: {
      readonly node: OpaquePeerId;
    } & Struct;
    readonly isRemoveClaim: boolean;
    readonly asRemoveClaim: {
      readonly node: OpaquePeerId;
    } & Struct;
    readonly isTransferNode: boolean;
    readonly asTransferNode: {
      readonly node: OpaquePeerId;
      readonly owner: MultiAddress;
    } & Struct;
    readonly isAddConnections: boolean;
    readonly asAddConnections: {
      readonly node: OpaquePeerId;
      readonly connections: Vec<OpaquePeerId>;
    } & Struct;
    readonly isRemoveConnections: boolean;
    readonly asRemoveConnections: {
      readonly node: OpaquePeerId;
      readonly connections: Vec<OpaquePeerId>;
    } & Struct;
    readonly type: 'AddWellKnownNode' | 'RemoveWellKnownNode' | 'SwapWellKnownNode' | 'ResetWellKnownNodes' | 'ClaimNode' | 'RemoveClaim' | 'TransferNode' | 'AddConnections' | 'RemoveConnections';
  }

  /** @name PalletPreimageCall (148) */
  interface PalletPreimageCall extends Enum {
    readonly isNotePreimage: boolean;
    readonly asNotePreimage: {
      readonly bytes: Bytes;
    } & Struct;
    readonly isUnnotePreimage: boolean;
    readonly asUnnotePreimage: {
      readonly hash_: H256;
    } & Struct;
    readonly isRequestPreimage: boolean;
    readonly asRequestPreimage: {
      readonly hash_: H256;
    } & Struct;
    readonly isUnrequestPreimage: boolean;
    readonly asUnrequestPreimage: {
      readonly hash_: H256;
    } & Struct;
    readonly type: 'NotePreimage' | 'UnnotePreimage' | 'RequestPreimage' | 'UnrequestPreimage';
  }

  /** @name PalletSchedulerCall (149) */
  interface PalletSchedulerCall extends Enum {
    readonly isSchedule: boolean;
    readonly asSchedule: {
      readonly when: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: u8;
      readonly call: Call;
    } & Struct;
    readonly isCancel: boolean;
    readonly asCancel: {
      readonly when: u32;
      readonly index: u32;
    } & Struct;
    readonly isScheduleNamed: boolean;
    readonly asScheduleNamed: {
      readonly id: U8aFixed;
      readonly when: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: u8;
      readonly call: Call;
    } & Struct;
    readonly isCancelNamed: boolean;
    readonly asCancelNamed: {
      readonly id: U8aFixed;
    } & Struct;
    readonly isScheduleAfter: boolean;
    readonly asScheduleAfter: {
      readonly after: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: u8;
      readonly call: Call;
    } & Struct;
    readonly isScheduleNamedAfter: boolean;
    readonly asScheduleNamedAfter: {
      readonly id: U8aFixed;
      readonly after: u32;
      readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
      readonly priority: u8;
      readonly call: Call;
    } & Struct;
    readonly type: 'Schedule' | 'Cancel' | 'ScheduleNamed' | 'CancelNamed' | 'ScheduleAfter' | 'ScheduleNamedAfter';
  }

  /** @name PalletSymmetricKeyCall (151) */
  interface PalletSymmetricKeyCall extends Enum {
    readonly isUpdateKey: boolean;
    readonly asUpdateKey: {
      readonly newKey: Bytes;
    } & Struct;
    readonly isRotateKey: boolean;
    readonly type: 'UpdateKey' | 'RotateKey';
  }

  /** @name PalletMembershipCall (152) */
  interface PalletMembershipCall extends Enum {
    readonly isAddMember: boolean;
    readonly asAddMember: {
      readonly who: MultiAddress;
    } & Struct;
    readonly isRemoveMember: boolean;
    readonly asRemoveMember: {
      readonly who: MultiAddress;
    } & Struct;
    readonly isSwapMember: boolean;
    readonly asSwapMember: {
      readonly remove: MultiAddress;
      readonly add: MultiAddress;
    } & Struct;
    readonly isResetMembers: boolean;
    readonly asResetMembers: {
      readonly members: Vec<AccountId32>;
    } & Struct;
    readonly isChangeKey: boolean;
    readonly asChangeKey: {
      readonly new_: MultiAddress;
    } & Struct;
    readonly isSetPrime: boolean;
    readonly asSetPrime: {
      readonly who: MultiAddress;
    } & Struct;
    readonly isClearPrime: boolean;
    readonly type: 'AddMember' | 'RemoveMember' | 'SwapMember' | 'ResetMembers' | 'ChangeKey' | 'SetPrime' | 'ClearPrime';
  }

  /** @name PalletCollectiveCall (154) */
  interface PalletCollectiveCall extends Enum {
    readonly isSetMembers: boolean;
    readonly asSetMembers: {
      readonly newMembers: Vec<AccountId32>;
      readonly prime: Option<AccountId32>;
      readonly oldCount: u32;
    } & Struct;
    readonly isExecute: boolean;
    readonly asExecute: {
      readonly proposal: Call;
      readonly lengthBound: Compact<u32>;
    } & Struct;
    readonly isPropose: boolean;
    readonly asPropose: {
      readonly threshold: Compact<u32>;
      readonly proposal: Call;
      readonly lengthBound: Compact<u32>;
    } & Struct;
    readonly isVote: boolean;
    readonly asVote: {
      readonly proposal: H256;
      readonly index: Compact<u32>;
      readonly approve: bool;
    } & Struct;
    readonly isCloseOldWeight: boolean;
    readonly asCloseOldWeight: {
      readonly proposalHash: H256;
      readonly index: Compact<u32>;
      readonly proposalWeightBound: Compact<u64>;
      readonly lengthBound: Compact<u32>;
    } & Struct;
    readonly isDisapproveProposal: boolean;
    readonly asDisapproveProposal: {
      readonly proposalHash: H256;
    } & Struct;
    readonly isClose: boolean;
    readonly asClose: {
      readonly proposalHash: H256;
      readonly index: Compact<u32>;
      readonly proposalWeightBound: SpWeightsWeightV2Weight;
      readonly lengthBound: Compact<u32>;
    } & Struct;
    readonly type: 'SetMembers' | 'Execute' | 'Propose' | 'Vote' | 'CloseOldWeight' | 'DisapproveProposal' | 'Close';
  }

  /** @name PalletDoasCall (157) */
  interface PalletDoasCall extends Enum {
    readonly isDoasRoot: boolean;
    readonly asDoasRoot: {
      readonly call: Call;
    } & Struct;
    readonly isDoasRootUncheckedWeight: boolean;
    readonly asDoasRootUncheckedWeight: {
      readonly call: Call;
      readonly weight: SpWeightsWeightV2Weight;
    } & Struct;
    readonly isDoas: boolean;
    readonly asDoas: {
      readonly who: MultiAddress;
      readonly call: Call;
    } & Struct;
    readonly type: 'DoasRoot' | 'DoasRootUncheckedWeight' | 'Doas';
  }

  /** @name PalletSudoError (158) */
  interface PalletSudoError extends Enum {
    readonly isRequireSudo: boolean;
    readonly type: 'RequireSudo';
  }

  /** @name PalletSimpleNftToken (159) */
  interface PalletSimpleNftToken extends Struct {
    readonly id: u128;
    readonly roles: BTreeMap<DscpNodeRuntimeRole, AccountId32>;
    readonly creator: AccountId32;
    readonly createdAt: u32;
    readonly destroyedAt: Option<u32>;
    readonly metadata: BTreeMap<Bytes, DscpNodeRuntimeMetadataValue>;
    readonly parents: Vec<u128>;
    readonly children: Option<Vec<u128>>;
  }

  /** @name PalletSimpleNftError (161) */
  interface PalletSimpleNftError extends Enum {
    readonly isNotOwned: boolean;
    readonly isAlreadyBurnt: boolean;
    readonly isTooManyMetadataItems: boolean;
    readonly isNoDefaultRole: boolean;
    readonly isOutOfBoundsParent: boolean;
    readonly isDuplicateParents: boolean;
    readonly isProcessInvalid: boolean;
    readonly isInvalidInput: boolean;
    readonly type: 'NotOwned' | 'AlreadyBurnt' | 'TooManyMetadataItems' | 'NoDefaultRole' | 'OutOfBoundsParent' | 'DuplicateParents' | 'ProcessInvalid' | 'InvalidInput';
  }

  /** @name PalletProcessValidationProcess (163) */
  interface PalletProcessValidationProcess extends Struct {
    readonly status: PalletProcessValidationProcessStatus;
    readonly program: Vec<PalletProcessValidationBinaryExpressionTreeBooleanExpressionSymbol>;
  }

  /** @name PalletProcessValidationProcessStatus (164) */
  interface PalletProcessValidationProcessStatus extends Enum {
    readonly isDisabled: boolean;
    readonly isEnabled: boolean;
    readonly type: 'Disabled' | 'Enabled';
  }

  /** @name PalletProcessValidationError (165) */
  interface PalletProcessValidationError extends Enum {
    readonly isAlreadyExists: boolean;
    readonly isNonExistingProcess: boolean;
    readonly isAlreadyDisabled: boolean;
    readonly isInvalidVersion: boolean;
    readonly isInvalidProgram: boolean;
    readonly type: 'AlreadyExists' | 'NonExistingProcess' | 'AlreadyDisabled' | 'InvalidVersion' | 'InvalidProgram';
  }

  /** @name PalletNodeAuthorizationError (167) */
  interface PalletNodeAuthorizationError extends Enum {
    readonly isPeerIdTooLong: boolean;
    readonly isTooManyNodes: boolean;
    readonly isAlreadyJoined: boolean;
    readonly isNotExist: boolean;
    readonly isAlreadyClaimed: boolean;
    readonly isNotClaimed: boolean;
    readonly isNotOwner: boolean;
    readonly isPermissionDenied: boolean;
    readonly type: 'PeerIdTooLong' | 'TooManyNodes' | 'AlreadyJoined' | 'NotExist' | 'AlreadyClaimed' | 'NotClaimed' | 'NotOwner' | 'PermissionDenied';
  }

  /** @name PalletPreimageRequestStatus (168) */
  interface PalletPreimageRequestStatus extends Enum {
    readonly isUnrequested: boolean;
    readonly asUnrequested: {
      readonly deposit: ITuple<[AccountId32, u128]>;
      readonly len: u32;
    } & Struct;
    readonly isRequested: boolean;
    readonly asRequested: {
      readonly deposit: Option<ITuple<[AccountId32, u128]>>;
      readonly count: u32;
      readonly len: Option<u32>;
    } & Struct;
    readonly type: 'Unrequested' | 'Requested';
  }

  /** @name PalletPreimageError (173) */
  interface PalletPreimageError extends Enum {
    readonly isTooBig: boolean;
    readonly isAlreadyNoted: boolean;
    readonly isNotAuthorized: boolean;
    readonly isNotNoted: boolean;
    readonly isRequested: boolean;
    readonly isNotRequested: boolean;
    readonly type: 'TooBig' | 'AlreadyNoted' | 'NotAuthorized' | 'NotNoted' | 'Requested' | 'NotRequested';
  }

  /** @name PalletSchedulerScheduled (176) */
  interface PalletSchedulerScheduled extends Struct {
    readonly maybeId: Option<U8aFixed>;
    readonly priority: u8;
    readonly call: FrameSupportPreimagesBounded;
    readonly maybePeriodic: Option<ITuple<[u32, u32]>>;
    readonly origin: DscpNodeRuntimeOriginCaller;
  }

  /** @name FrameSupportPreimagesBounded (177) */
  interface FrameSupportPreimagesBounded extends Enum {
    readonly isLegacy: boolean;
    readonly asLegacy: {
      readonly hash_: H256;
    } & Struct;
    readonly isInline: boolean;
    readonly asInline: Bytes;
    readonly isLookup: boolean;
    readonly asLookup: {
      readonly hash_: H256;
      readonly len: u32;
    } & Struct;
    readonly type: 'Legacy' | 'Inline' | 'Lookup';
  }

  /** @name DscpNodeRuntimeOriginCaller (179) */
  interface DscpNodeRuntimeOriginCaller extends Enum {
    readonly isSystem: boolean;
    readonly asSystem: FrameSupportDispatchRawOrigin;
    readonly isVoid: boolean;
    readonly isTechnicalCommittee: boolean;
    readonly asTechnicalCommittee: PalletCollectiveRawOrigin;
    readonly type: 'System' | 'Void' | 'TechnicalCommittee';
  }

  /** @name FrameSupportDispatchRawOrigin (180) */
  interface FrameSupportDispatchRawOrigin extends Enum {
    readonly isRoot: boolean;
    readonly isSigned: boolean;
    readonly asSigned: AccountId32;
    readonly isNone: boolean;
    readonly type: 'Root' | 'Signed' | 'None';
  }

  /** @name PalletCollectiveRawOrigin (181) */
  interface PalletCollectiveRawOrigin extends Enum {
    readonly isMembers: boolean;
    readonly asMembers: ITuple<[u32, u32]>;
    readonly isMember: boolean;
    readonly asMember: AccountId32;
    readonly isPhantom: boolean;
    readonly type: 'Members' | 'Member' | 'Phantom';
  }

  /** @name PalletSchedulerError (183) */
  interface PalletSchedulerError extends Enum {
    readonly isFailedToSchedule: boolean;
    readonly isNotFound: boolean;
    readonly isTargetBlockNumberInPast: boolean;
    readonly isRescheduleNoChange: boolean;
    readonly isNamed: boolean;
    readonly type: 'FailedToSchedule' | 'NotFound' | 'TargetBlockNumberInPast' | 'RescheduleNoChange' | 'Named';
  }

  /** @name PalletSymmetricKeyError (185) */
  interface PalletSymmetricKeyError extends Enum {
    readonly isIncorrectKeyLength: boolean;
    readonly type: 'IncorrectKeyLength';
  }

  /** @name PalletMembershipError (187) */
  interface PalletMembershipError extends Enum {
    readonly isAlreadyMember: boolean;
    readonly isNotMember: boolean;
    readonly isTooManyMembers: boolean;
    readonly type: 'AlreadyMember' | 'NotMember' | 'TooManyMembers';
  }

  /** @name PalletCollectiveVotes (189) */
  interface PalletCollectiveVotes extends Struct {
    readonly index: u32;
    readonly threshold: u32;
    readonly ayes: Vec<AccountId32>;
    readonly nays: Vec<AccountId32>;
    readonly end: u32;
  }

  /** @name PalletCollectiveError (190) */
  interface PalletCollectiveError extends Enum {
    readonly isNotMember: boolean;
    readonly isDuplicateProposal: boolean;
    readonly isProposalMissing: boolean;
    readonly isWrongIndex: boolean;
    readonly isDuplicateVote: boolean;
    readonly isAlreadyInitialized: boolean;
    readonly isTooEarly: boolean;
    readonly isTooManyProposals: boolean;
    readonly isWrongProposalWeight: boolean;
    readonly isWrongProposalLength: boolean;
    readonly type: 'NotMember' | 'DuplicateProposal' | 'ProposalMissing' | 'WrongIndex' | 'DuplicateVote' | 'AlreadyInitialized' | 'TooEarly' | 'TooManyProposals' | 'WrongProposalWeight' | 'WrongProposalLength';
  }

  /** @name SpRuntimeMultiSignature (192) */
  interface SpRuntimeMultiSignature extends Enum {
    readonly isEd25519: boolean;
    readonly asEd25519: SpCoreEd25519Signature;
    readonly isSr25519: boolean;
    readonly asSr25519: SpCoreSr25519Signature;
    readonly isEcdsa: boolean;
    readonly asEcdsa: SpCoreEcdsaSignature;
    readonly type: 'Ed25519' | 'Sr25519' | 'Ecdsa';
  }

  /** @name SpCoreSr25519Signature (193) */
  interface SpCoreSr25519Signature extends U8aFixed {}

  /** @name SpCoreEcdsaSignature (194) */
  interface SpCoreEcdsaSignature extends U8aFixed {}

  /** @name FrameSystemExtensionsCheckNonZeroSender (197) */
  type FrameSystemExtensionsCheckNonZeroSender = Null;

  /** @name FrameSystemExtensionsCheckSpecVersion (198) */
  type FrameSystemExtensionsCheckSpecVersion = Null;

  /** @name FrameSystemExtensionsCheckTxVersion (199) */
  type FrameSystemExtensionsCheckTxVersion = Null;

  /** @name FrameSystemExtensionsCheckGenesis (200) */
  type FrameSystemExtensionsCheckGenesis = Null;

  /** @name FrameSystemExtensionsCheckNonce (203) */
  interface FrameSystemExtensionsCheckNonce extends Compact<u32> {}

  /** @name FrameSystemExtensionsCheckWeight (204) */
  type FrameSystemExtensionsCheckWeight = Null;

  /** @name PalletTransactionPaymentFreeChargeTransactionPayment (205) */
  interface PalletTransactionPaymentFreeChargeTransactionPayment extends Compact<u128> {}

  /** @name DscpNodeRuntimeRuntime (206) */
  type DscpNodeRuntimeRuntime = Null;

} // declare module
