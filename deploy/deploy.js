require('dotenv').config()
const { 
  SystemProgram, 
  SYSVAR_RENT_PUBKEY, 
  TransactionInstruction, 
  Transaction, 
  Connection, 
  PublicKey, 
  Keypair, 
  clusterApiUrl,
  BpfLoader,
  sendAndConfirmTransaction,
  BPF_LOADER_PROGRAM_ID
} = require('@solana/web3.js')
const fs = require('fs').promises
const BN = require("bn.js")
const bs58 = require('bs58')
const { deserialize, serialize } = require('borsh')
let update_account = Keypair.fromSecretKey(bs58.decode(process.env.update_privKey))
const payer_account = Keypair.fromSecretKey(bs58.decode(process.env.payer_privKey))
const fsPath = './nfts.so'
const NFTINTERFACEPREFIX = "nftinterface"
const WHITELISTPREFIX = 'whitelist'

class CreateArgs {
	instruction = new BN(0)
	token_price_per_nft
  max_supply
  is_sealed
	constructor(args) {
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
	constructor(args) {
		this.token_price_per_nft = new BN(args.token_price_per_nft * 10 ** 9)
    this.max_supply = args.max_supply
    this.total_supply = args.total_supply !== -1 ? args.total_supply : undefined
    this.is_sealed = args.is_sealed
	}
}

class MintArgs {
  instruction = new BN(2)
  constructor() {
  }
}

class GetFeeArgs {
  instruction = new BN(3)
  wanted_supply
  constructor(args) {
      this.wanted_supply = args ? new BN(args.wanted_supply * 10 ** 9) : undefined
  }
}

class CreateWhitelistArgs {
  instruction = 4
  is_sealed
  constructor(args) {
    this.is_sealed = args.is_sealed
  }
}

class ModifyWhitelistArgs {
  instruction = 5
  is_sealed
  constructor(args) {
    this.is_sealed = args.is_sealed
  }
}

class Whitelist {
  is_sealed
  constructor(args) {
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
  constructor(args) {
      this.token_price_per_nft = args.token_price_per_nft / (10 ** 9)
      this.max_supply = args.max_supply
      this.total_supply = args.total_supply
      this.update_authority_key = args.update_authority_key
      this.fee_receiver_key = args.fee_receiver_key
      this.is_sealed = args.is_sealed
  }
}

const NFT_INTERFACE_SCHEMA = new Map([
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
    MintArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
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

const createNFTS = async(
  token_price_per_nft,
  max_supply,
  is_sealed,
  program_id,
) => {
  const nfts_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(NFTINTERFACEPREFIX),
          program_id.toBuffer(),
          update_account.publicKey.toBuffer(),
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
          {pubkey:payer_account.publicKey, isSigner: true, isWritable: false},
          {pubkey:update_account.publicKey, isSigner: false, isWritable: false},
          {pubkey:SystemProgram.programId, isSigner: false, isWritable: false},
          {pubkey:SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
      ],
      programId: program_id,
      data: ctxnData,
  })
  return {cinstruction, fee_receiver_key}
}

const modifyNFTS = async(
  token_price_per_nft,
  max_supply,
  total_supply,
  is_sealed,
  program_id,
) => {
  const nft_interface_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(NFTINTERFACEPREFIX),
          program_id.toBuffer(),
          update_account.publicKey.toBuffer(),
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
          {pubkey:update_account.publicKey, isSigner: true, isWritable: false},
      ],
      programId: program_id,
      data: utxnData,
  })
  
  return uinstruction
}

const mintNFT = async(
  program_id,
  fee_receiver_key,
) => {

  const nft_interface_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(NFTINTERFACEPREFIX),
          program_id.toBuffer(),
          update_account.publicKey.toBuffer(),
      ],
      program_id
  )
  const mvalue = new MintArgs()
  const mtxnData = Buffer.from(serialize(NFT_INTERFACE_SCHEMA, mvalue))

  const minstruction = new TransactionInstruction({
      keys: [
          {pubkey:nft_interface_account_key[0], isSigner: false, isWritable: true},
          {pubkey:update_account.publicKey, isSigner: false, isWritable: false},
          {pubkey:fee_receiver_key, isSigner: false, isWritable: true},
          {pubkey:payer_account.publicKey, isSigner: true, isWritable: true},
          {pubkey:SystemProgram.programId, isSigner: false, isWritable: false},
      ],
      programId: program_id,
      data: mtxnData,
  })
  return minstruction
}

const getFeeNFTS = async(
  program_id,
  fee_receiver_account,
  wanted_supply,
) => {

  const nft_interface_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(NFTINTERFACEPREFIX),
          program_id.toBuffer(),
          update_account.publicKey.toBuffer(),
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
          {pubkey:update_account.publicKey, isSigner: true, isWritable: false},
          {pubkey:fee_receiver_account.publicKey, isSigner: true, isWritable: true},
          {pubkey:payer_account.publicKey, isSigner: true, isWritable: true},
          {pubkey:SystemProgram.programId, isSigner: false, isWritable: false},
      ],
      programId: program_id,
      data: gtxnData,
  })
  
  return ginstruction
}

const getNFTS = async(
  conn,
  program_id,
) => {
  const nft_interface_account_key = await PublicKey.findProgramAddress(
    [
        Buffer.from(NFTINTERFACEPREFIX),
        program_id.toBuffer(),
        update_account.publicKey.toBuffer(),
    ],
    program_id
  )
  const accountInfo = await conn.getAccountInfo(nft_interface_account_key[0])
  if (accountInfo === null) {
    throw 'Error: cannot find the greeted account'
  }

  const ni = deserialize(
      NFT_INTERFACE_SCHEMA,
      NFTInterface,
      accountInfo.data,
  )
  return ni
} 

const createWhitelist = async(
  program_id,
  whiltelist_account_pubkey,
  is_sealed,
) => {
  const whitelist_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(WHITELISTPREFIX),
          program_id.toBuffer(),
          update_account.publicKey.toBuffer(),
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
          {pubkey:update_account.publicKey, isSigner: false, isWritable: false},
          {pubkey:payer_account.publicKey, isSigner: true, isWritable: false},
          {pubkey:whiltelist_account_pubkey, isSigner: false, isWritable: false},
          {pubkey:SystemProgram.programId, isSigner: false, isWritable: false},
          {pubkey:SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false},
      ],
      programId: program_id,
      data: ctxnData,
  })
  return cinstruction
}

const modifyWhitelist = async(
  program_id,
  whiltelist_account_pubkey,
  is_sealed,
) => {
  const whitelist_account_key = await PublicKey.findProgramAddress(
      [
          Buffer.from(WHITELISTPREFIX),
          program_id.toBuffer(),
          update_account.publicKey.toBuffer(),
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
          {pubkey:update_account.publicKey, isSigner: false, isWritable: false},
          {pubkey:whiltelist_account_pubkey, isSigner: false, isWritable: false},
      ],
      programId: program_id,
      data: ctxnData,
  })
  return cinstruction
}

const getWhitelist = async(
  conn,
  program_id,
  whiltelist_account_pubkey
) => {
  const whitelist_account_key = await PublicKey.findProgramAddress(
    [
        Buffer.from(WHITELISTPREFIX),
        program_id.toBuffer(),
        update_account.publicKey.toBuffer(),
        whiltelist_account_pubkey.toBuffer()
    ],
    program_id
)
  const accountInfo = await conn.getAccountInfo(whitelist_account_key[0])
  if (accountInfo === null) {
    throw 'Error: cannot find the greeted account'
  }

  const whi = deserialize(
      NFT_INTERFACE_SCHEMA,
      Whitelist,
      accountInfo.data,
  )
  return whi
} 

(async () => {
  console.log({
      Payer: payer_account.publicKey.toBase58(),
      Update: update_account.publicKey.toBase58()
  })

  const devnet = clusterApiUrl('devnet')
  const conn = new Connection(devnet)
  
  // const programId = new PublicKey(process.env.program_id)
  // console.log(programId.toBase58())
      const programAccount = new Keypair()
      const programId = programAccount.publicKey
      console.log('Program loaded to account')
      console.log({programIdBase58: programId.toBase58()})
      console.log("\n#4 Loading Program to Account : upload smart contract using BPF LOADER ...")
      const program = await fs.readFile(fsPath)
      console.log({ program })
      await BpfLoader.load(conn, update_account, programAccount, program, BPF_LOADER_PROGRAM_ID)
      process.exit(0)
  console.log("\n Interact with smart contact : sending some data to store in dApp")
  
  let transaction =new Transaction()

  // const cinstruction = await createNFTS(
  //   0.99,
  //   10000,
  //   true,
  //   programId
  // )
  // console.log("Save it to env fee_receiver_privKey. \n ", cinstruction.fee_receiver_key.secretKey)
  // console.log("PubKey : ", cinstruction.fee_receiver_key.publicKey.toBase58())
  // transaction.add(cinstruction.cinstruction)
  
  const minstruction = await modifyNFTS(
    1.4,
    10000,
    -1,
    true,
    programId
  )
  transaction.add(minstruction)

//   const fee_receiver_privKey =  [
//     91, 120,  10, 222, 220, 255, 100,  57, 124, 225, 100,
//    175,  91, 110,  47, 148, 240, 216, 224,  75, 197, 179,
//     78, 163, 241, 166, 187,  48, 232,  77, 231, 190,  35,
//    239,  78, 171,  68,  54,   5, 232,  97,  92, 157, 134,
//    213,  17, 155, 104,  64,  54,  67, 207, 121, 250, 236,
//     22, 235,   9, 167,  20, 196, 157,  99, 146
//  ]
//   const fee_receiver_secretkey = Uint8Array.from(fee_receiver_privKey)
//   const fee_receiver_account = Keypair.fromSecretKey(fee_receiver_secretkey)
//   console.log(fee_receiver_account.publicKey.toBase58())
  
//   const mintinstruction = await mintNFT(
//     programId,
//     fee_receiver_account.publicKey
//   )
//   transaction.add(mintinstruction)

  // const ginstruction = await getFeeNFTS(
  //   programId,
  //   fee_receiver_account,
  //   2
  // )
  // transaction.add(ginstruction)

  const whiltelist_pubkey = new PublicKey('8jdgz3iKVPr5nQuJGNQHsHn1Pd2dFYmi7amnpfsi5jir')
  // const cwinstruction = await createWhitelist(
  //   programId,
  //   whiltelist_pubkey,
  //   true
  // )
  // transaction.add(cwinstruction)
  
  // const mwinstruction = await modifyWhitelist(
  //   programId,
  //   whiltelist_pubkey,
  //   true
  // )
  // transaction.add(mwinstruction)

  const signature = await sendAndConfirmTransaction(
      conn,
      transaction,
      [
        payer_account, 
        update_account,
        // cinstruction.fee_receiver_key,
        // fee_receiver_account,
      ], 
      // If modify instruction add this ', update_account'
      // If create instruction add this ', cinstruction.fee_receiver_key'
      // If get fee instruction add this ', fee_receiver_account, update_account'
      { commitment: 'max', preflightCommitment: 'max' },
  )
  
  const info = await getNFTS(conn, programId)
  console.log(
      '\n token_price_per_nft: ',info.token_price_per_nft,
      '\n max_supply: ', info.max_supply,
      '\n total_supply: ', info.total_supply,
      '\n update_authority_key: ', info.update_authority_key,
      '\n fee_receiver_key: ', info.fee_receiver_key,
      '\n is_sealed: ', info.is_sealed,
  )
  const whinfo = await getWhitelist(conn, programId, whiltelist_pubkey)
  console.log(
    '\n', whiltelist_pubkey.toBase58(), ' : ', whinfo.is_sealed
  )

})()

