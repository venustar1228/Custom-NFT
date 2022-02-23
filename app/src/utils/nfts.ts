import { 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY, 
  TransactionInstruction, 
  Transaction, 
  Connection, 
  PublicKey, 
  Keypair, 
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import BN from "bn.js"
import { deserialize, serialize } from 'borsh'
import {
  NFTINTERFACEPREFIX,
  WHITELISTPREFIX,
  net,
} from './constant'
class CreateArgs {
	instruction = new BN(0)
	token_price_per_nft
  max_supply
  is_sealed
	constructor(args: {
    token_price_per_nft: any,
    max_supply: number,
    is_sealed: boolean
  }) {
		this.token_price_per_nft = new BN(args.token_price_per_nft * 10 ** 9)
    this.max_supply = args.max_supply
    this.is_sealed = args.is_sealed
	}
}

class ModifyArgs {
	instruction = new BN(1)
	token_price_per_nft
  max_supply
  total_supply
  is_sealed
	constructor(args: {
    token_price_per_nft: any,
    max_supply: number,
    total_supply:number,
    is_sealed: boolean,
  }) {
		this.token_price_per_nft = new BN(args.token_price_per_nft * 10 ** 9)
    this.max_supply = args.max_supply
    this.total_supply = args.total_supply !== -1 ? args.total_supply : undefined
    this.is_sealed = args.is_sealed
	}
}

class GetFeeArgs {
  instruction = new BN(3)
  wanted_supply
  constructor(args: {
    wanted_supply: number
  }) {
      this.wanted_supply = args ? new BN(args.wanted_supply * 10 ** 9) : undefined
  }
}

class CreateWhitelistArgs {
  instruction = 4
  is_sealed
  constructor(args: {
    is_sealed: boolean
  }) {
    this.is_sealed = args.is_sealed
  }
}

class ModifyWhitelistArgs {
  instruction = 5
  is_sealed
  constructor(args: {
    is_sealed: boolean
  }) {
    this.is_sealed = args.is_sealed
  }
}

class Whitelist {
  is_sealed
  constructor(args:{
    is_sealed: boolean
  }) {
    this.is_sealed = args.is_sealed
  }
}

class NFTInterface {
  token_price_per_nft
  max_supply
  total_supply 
  update_authority_key
  fee_receiver_key
  is_sealed
  constructor(args: {
    token_price_per_nft: any,
    max_supply: number,
    total_supply: number,
    update_authority_key: BN,
    fee_receiver_key: BN,
    is_sealed: boolean
  }) {
      this.token_price_per_nft = args.token_price_per_nft / (10 ** 9)
      this.max_supply = args.max_supply
      this.total_supply = args.total_supply
      this.update_authority_key = args.update_authority_key
      this.fee_receiver_key = args.fee_receiver_key
      this.is_sealed = args.is_sealed
  }
}

const NFT_INTERFACE_SCHEMA = new Map<any, any>([
	[
		CreateArgs,
		{
			kind: 'struct',
			fields: [
				['instruction', 'u8'],
				['token_price_per_nft', 'u64'],
				['max_supply', 'u16'],
				['is_sealed', 'u8'],
			],
		},
	],
  [
    ModifyArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['token_price_per_nft', {kind: 'option', type: 'u64'}],
        ['max_supply', { kind: 'option', type: 'u16'}],
        ['total_supply', { kind: 'option', type: 'u16'}],
        ['is_sealed', { kind: 'option', type: 'u8'}]
      ],
    },
  ],
  [
    GetFeeArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['wanted_supply', {kind: 'option', type: 'u64'}], // bool
      ],
    },
  ],
  [
    CreateWhitelistArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['is_sealed', 'u8'], // bool
      ],
    },
  ],
  [
    ModifyWhitelistArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['is_sealed', 'u8'], // bool
      ],
    },
  ],
  [
    NFTInterface,
    {
      kind:'struct',
      fields: [
        ['token_price_per_nft', 'u64'],
        ['max_supply', 'u16'],
        ['total_supply', 'u16'],
        ['update_authority_key', 'u256'],
        ['fee_receiver_key', 'u256'],
        ['is_sealed', 'u8']
      ]
    }
  ],
  [
    Whitelist,
    {
      kind:'struct',
      fields: [
        ['is_sealed', 'u8']
      ]
    }
  ],
])

export const createNFTS = async(
  token_price_per_nft: number,
  max_supply: number,
  is_sealed: boolean,
  program_id: PublicKey,
  wallet: any,
  update_authority_key: PublicKey
) => {
  const nfts_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(NFTINTERFACEPREFIX),
          program_id.toBuffer(),
          update_authority_key.toBuffer(),
      ],
      program_id
  )
  const cvalue = new CreateArgs({
    token_price_per_nft,
    max_supply,
    is_sealed
  })

  const fee_receiver_key = new Keypair()
  const ctxnData = Buffer.from(serialize(NFT_INTERFACE_SCHEMA, cvalue))

  const cinstruction = new TransactionInstruction({
      keys: [
          {pubkey:nfts_account_key[0], isSigner: false, isWritable: true},
          {pubkey:fee_receiver_key.publicKey, isSigner: true, isWritable: true},
          {pubkey:wallet.publicKey, isSigner: true, isWritable: false},
          {pubkey:update_authority_key, isSigner: false, isWritable: false},
          {pubkey:SystemProgram.programId, isSigner: false, isWritable: false},
          {pubkey:SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
      ],
      programId: program_id,
      data: ctxnData,
  })
  return {cinstruction, fee_receiver_key}
}

export const modifyNFTS = async(
  token_price_per_nft: number,
  max_supply: number,
  total_supply: number,
  is_sealed: boolean,
  program_id: PublicKey,
  wallet: any,
  update_authority_key: PublicKey
) => {
  const nft_interface_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(NFTINTERFACEPREFIX),
          program_id.toBuffer(),
          update_authority_key.toBuffer(),
      ],
      program_id
  )
  const uvalue = new ModifyArgs({
    token_price_per_nft,
    max_supply,
    total_supply,
    is_sealed,
  })
  const utxnData = Buffer.from(serialize(NFT_INTERFACE_SCHEMA, uvalue))

  const uinstruction = new TransactionInstruction({
      keys: [
          {pubkey:nft_interface_account_key[0], isSigner: false, isWritable: true},
          {pubkey:update_authority_key, isSigner: true, isWritable: false},
      ],
      programId: program_id,
      data: utxnData,
  })
  
  return uinstruction
}

export const getFeeNFTS = async(
  program_id: PublicKey,
  fee_receiver_account: any,
  wanted_supply: number,
  wallet: any,
  update_authority_key: PublicKey
) => {

  const nft_interface_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(NFTINTERFACEPREFIX),
          program_id.toBuffer(),
          update_authority_key.toBuffer(),
      ],
      program_id
  )
  const g = new GetFeeArgs({
    wanted_supply
  })
  const gtxnData = Buffer.from(serialize(NFT_INTERFACE_SCHEMA, g))

  const ginstruction = new TransactionInstruction({
      keys: [
          {pubkey:nft_interface_account_key[0], isSigner: false, isWritable: true},
          {pubkey:update_authority_key, isSigner: true, isWritable: false},
          {pubkey:fee_receiver_account.publicKey, isSigner: true, isWritable: true},
          {pubkey:wallet.publicKey, isSigner: true, isWritable: true},
          {pubkey:SystemProgram.programId, isSigner: false, isWritable: false},
      ],
      programId: program_id,
      data: gtxnData,
  })
  
  return ginstruction
}

export const getNFTS = async(
  conn: Connection,
  program_id: PublicKey,
  update_authority_key: PublicKey
) => {
  const nft_interface_account_key = await PublicKey.findProgramAddress(
    [
        Buffer.from(NFTINTERFACEPREFIX),
        program_id.toBuffer(),
        update_authority_key.toBuffer(),
    ],
    program_id
  )
  const accountInfo = await conn.getAccountInfo(nft_interface_account_key[0])
  if (accountInfo === null) {
    throw 'Error: cannot find the account'
  }

  const ni = deserialize(
      NFT_INTERFACE_SCHEMA,
      NFTInterface,
      accountInfo.data,
  )
  return ni
} 

export const createWhitelist = async(
  program_id: PublicKey,
  whiltelist_pubkey_str: string,
  is_sealed: boolean,
  wallet: any,
  update_authority_key: PublicKey
) => {
  const whiltelist_account_pubkey = new PublicKey(whiltelist_pubkey_str)
  const whitelist_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(WHITELISTPREFIX),
          program_id.toBuffer(),
          update_authority_key.toBuffer(),
          whiltelist_account_pubkey.toBuffer()
      ],
      program_id
  )
  const cvalue = new CreateWhitelistArgs({
    is_sealed
  })

  const ctxnData = Buffer.from(serialize(NFT_INTERFACE_SCHEMA, cvalue))

  const cinstruction = new TransactionInstruction({
      keys: [
          {pubkey:whitelist_account_key[0], isSigner: false, isWritable: true},
          {pubkey:update_authority_key, isSigner: false, isWritable: false},
          {pubkey:wallet.publicKey, isSigner: true, isWritable: false},
          {pubkey:whiltelist_account_pubkey, isSigner: false, isWritable: false},
          {pubkey:SystemProgram.programId, isSigner: false, isWritable: false},
          {pubkey:SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
      ],
      programId: program_id,
      data: ctxnData,
  })
  return cinstruction
}

export const modifyWhitelist = async(
  program_id: PublicKey,
  whiltelist_pubkey_str: string,
  is_sealed: boolean,
  update_authority_key: PublicKey
) => {

  const whiltelist_account_pubkey = new PublicKey(whiltelist_pubkey_str)
  const whitelist_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(WHITELISTPREFIX),
          program_id.toBuffer(),
          update_authority_key.toBuffer(),
          whiltelist_account_pubkey.toBuffer()
      ],
      program_id
  )
  const cvalue = new ModifyWhitelistArgs({
    is_sealed
  })

  const ctxnData = Buffer.from(serialize(NFT_INTERFACE_SCHEMA, cvalue))

  const cinstruction = new TransactionInstruction({
      keys: [
          {pubkey:whitelist_account_key[0], isSigner: false, isWritable: true},
          {pubkey:update_authority_key, isSigner: false, isWritable: false},
          {pubkey:whiltelist_account_pubkey, isSigner: false, isWritable: false},
      ],
      programId: program_id,
      data: ctxnData,
  })
  return cinstruction
}

export const getWhitelist = async(
  conn: Connection,
  program_id: PublicKey,
  whiltelist_pubkey_str: string,
  update_authority_key: PublicKey
) => {
  const whiltelist_account_pubkey = new PublicKey(whiltelist_pubkey_str)

  const whitelist_account_key = await PublicKey.findProgramAddress(
    [
        Buffer.from(WHITELISTPREFIX),
        program_id.toBuffer(),
        update_authority_key.toBuffer(),
        whiltelist_account_pubkey.toBuffer()
    ],
    program_id
)
  const accountInfo = await conn.getAccountInfo(whitelist_account_key[0])
  if (accountInfo === null) {
    throw 'Error: cannot find the account'
  }

  const whi = deserialize(
      NFT_INTERFACE_SCHEMA,
      Whitelist,
      accountInfo.data,
  )
  return whi
} 

export const sendTransactionWithRetry = async (
  instruction: any,
  signers: any[],
  conn: Connection
) => {
  let transaction = new Transaction()
  transaction.add(instruction)
  console.log(signers)
  transaction.feePayer = signers[1].publicKey
  const signature = await sendAndConfirmTransaction(
    conn,
    transaction,
    signers,
    { commitment: 'max', preflightCommitment: 'max' },
  )
  return signature
}
