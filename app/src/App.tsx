import React, { useEffect, useState } from 'react';
import './App.css';
import './styles.css'

import * as web3 from '@solana/web3.js'
import {
  createNFTS,
  modifyNFTS,
  getFeeNFTS,
  getNFTS,
  sendTransactionWithRetry,
  getWhitelist,
  createWhitelist,
  modifyWhitelist,
} from './utils/nfts'
import bs58 from 'bs58'

const { clusterApiUrl, PublicKey } = web3
const network = clusterApiUrl('devnet');
const connection =new web3.Connection(network)

function App() {
  const [wallet_privkey, setWalletPrivKey] = useState("")
  const [program_id, setProgramId] = useState("")
  const [update_authority_key, setUpdateAuthorityKey] = useState("")
  const [max_supply, setMaxSupply] = useState<any>(0)
  const [total_supply, setTotalSupply] = useState<any>(0)
  const [token_price, setTokenPrice] = useState<any>(0)
  const [is_sealed, setSealed] = useState(true)
  const [fee_receiver_privKey, setFeeReceiverPrivKey] = useState<web3.Keypair>()
  const [status, setStatus] = useState("")
  const [can_create, setCanCreate] = useState(true)
  const [is_whitelisted, setIsWhitelisted] = useState(false)

  const [cmax_supply, setCMaxSupply] = useState<any>(0)
  const [cnft_price, setCNFTPrice] = useState<any>(0)
  const [cis_sealed, setCSealed] = useState(false)
  const [mmax_supply, setMMaxSupply] = useState<any>(0)
  const [mnft_price, setMNFTPrice] = useState<any>(0)
  const [edit_fee_receiver_key, setEditsFeeReceiverKey] = useState("")
  const [mis_sealed, setMSealed] = useState(false)
  const [whitelist_account_pubkey, setWhitelistAccountPubkey] = useState("")
  const [is_wSealed, setWSealed] = useState(false)
  const [can_modifyWhitelist, setCanWhilteistchange] = useState(false)
  const onChangeProgramId = (e: React.FormEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value
    setProgramId(newValue)
  }

  const onChangeUpdateAuthorityKey = (e: React.FormEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value
    setUpdateAuthorityKey(newValue)
  }

  const onChangeWalletPrivKey= (e: React.FormEvent<HTMLInputElement>) => {
    const newValue = e.currentTarget.value
    setWalletPrivKey(newValue)
  }


  const onChangeCMaxSupply = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setCMaxSupply(newValue)
  }

  const onChangeCNFTPrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setCNFTPrice(newValue)
  }

  const onChangeCSealed = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked 
    setCSealed(newValue)
  }
  const onChangeMMaxSupply = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setMMaxSupply(newValue)
  }

  const onChangeMNFTPrice = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setMNFTPrice(newValue)
  }

  const onChangeMSealed = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked 
    setMSealed(newValue)
  }

  const onChangeWSealed = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked 
    setWSealed(newValue)
  }

  const onChangeFeeReceiverKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value 
    setEditsFeeReceiverKey(newValue)
  }

  const onChangeWhitelistAccountPubkey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value 
    setWhitelistAccountPubkey(newValue)
  }

  const getSomeData = async() => {
    const pID = new PublicKey(program_id)
    const update_account = web3.Keypair.fromSecretKey(bs58.decode(update_authority_key))
    const UAK = update_account.publicKey
    const ni = await getNFTS(connection, pID, UAK)
    setMaxSupply(ni.max_supply)
    setTotalSupply(ni.total_supply)
    setSealed(ni.is_sealed)
    setTokenPrice(ni.token_price_per_nft)
    setCanCreate(false)
  }
  const getWhitelistForUI = async() => {
    try{
      const pID = new PublicKey(program_id)
      const update_account = web3.Keypair.fromSecretKey(bs58.decode(update_authority_key))
      const UAK = update_account.publicKey
      const wh = await getWhitelist(connection, pID, whitelist_account_pubkey, UAK)
      console.log(wh.is_sealed)
      setIsWhitelisted(wh.is_sealed)
      setCanWhilteistchange(true)
    } catch(error) {
      setIsWhitelisted(false)
      setCanWhilteistchange(false)
    }
  }

  const createIWhitelist = async( ) => {
    setStatus("Whitelist function....")
      console.log(is_wSealed)
    const pID = new PublicKey(program_id)
    const update_account = web3.Keypair.fromSecretKey(bs58.decode(update_authority_key))
    const UAK = update_account.publicKey
    const payer_account = web3.Keypair.fromSecretKey(bs58.decode(wallet_privkey))
    const i = can_modifyWhitelist ?await modifyWhitelist(pID, whitelist_account_pubkey, is_wSealed, UAK): await createWhitelist(pID, whitelist_account_pubkey, is_wSealed, payer_account, UAK)
    await sendTransactionWithRetry(i, [payer_account, payer_account], connection)
    getWhitelistForUI()
    setStatus("Transaction sent.")
    
  }

  useEffect(() => {
      (async() => {
        if(program_id.length > 32 && update_authority_key.length > 32) {
          try{
            getSomeData()
            if(whitelist_account_pubkey.length > 32)
              getWhitelistForUI()
          } catch(e) {
            setCanCreate(true)
            setStatus("Something went wrong!")

          }   
        }
        else setStatus("Please insert correct program id and update authority key.")
      })()
  })
  const createINFTS = async() => {
    setStatus("Creating function....")
    const pID = new PublicKey(program_id)
    const update_account = web3.Keypair.fromSecretKey(bs58.decode(update_authority_key))
    const UAK = update_account.publicKey
    const payer_account = web3.Keypair.fromSecretKey(bs58.decode(wallet_privkey))
    const i = await createNFTS(cnft_price, cmax_supply, cis_sealed, pID, payer_account, UAK)
    setFeeReceiverPrivKey(i.fee_receiver_key)
    await sendTransactionWithRetry(i.cinstruction, [i.fee_receiver_key, payer_account], connection)
    await getSomeData()
    setStatus("Transaction sent.")
  }
  const modifyINFTS = async() => {
    setStatus("Modifing function....")

    const pID = new PublicKey(program_id)
    const update_account = web3.Keypair.fromSecretKey(bs58.decode(update_authority_key))
    const payer_account = web3.Keypair.fromSecretKey(bs58.decode(wallet_privkey))
    const i = await modifyNFTS(mnft_price, mmax_supply, -1,mis_sealed, pID, payer_account, update_account.publicKey)
    console.log(i)
    await sendTransactionWithRetry(i, [update_account, payer_account], connection)
    await getSomeData()
    setStatus("Transaction sent.")
  }

  const getFeeINFTS = async() => {
    setStatus("Get Fee function....")

    const pID = new PublicKey(program_id)
    const update_account = web3.Keypair.fromSecretKey(bs58.decode(update_authority_key))
    const payer_account = web3.Keypair.fromSecretKey(bs58.decode(wallet_privkey))
    const fee_receiver_account = web3.Keypair.fromSecretKey(bs58.decode(edit_fee_receiver_key))
    const i = await getFeeNFTS(pID, fee_receiver_account, 10000, payer_account, update_account.publicKey)
    console.log(i)
    await sendTransactionWithRetry(i, [update_account, payer_account, fee_receiver_account], connection)
    await getSomeData()
    setStatus("Transaction sent.")
  }
  return (

    <div className="App container">
      <h1>{status}</h1>

      <p className="text-left"><mark>Max Supply</mark>: {max_supply}, <mark>Total Supply</mark>: {total_supply}, <mark>Check Whitelist</mark>: {is_sealed ? "false": "true"} <mark>TokenPrice</mark>{token_price} SOL</p>
      <br></br>
           Fee Receiver: {fee_receiver_privKey != undefined ?bs58.encode(fee_receiver_privKey.secretKey): ""}
      <div className="input-group">
        <span className="input-group-text">Program Id</span>
        <input type="text" className="form-control" placeholder="EmsPAwrJ5wNQjXNsn9knWgEj4fnKAnWkDQ7rwB1PcUMX" onChange={onChangeProgramId}></input>
      </div>
      <div className="input-group">
        <span className="input-group-text">Update Authority Key</span>
        <input type="text" className="form-control" placeholder="5r86ZkrUp2zyqjb91aSKLadHcKT54a13TBBdiJnraFqE" onChange={onChangeUpdateAuthorityKey}></input>
      </div>
      <div className="input-group">
        <span className="input-group-text">Wallet Priv Key</span>
        <input type="text" className="form-control" placeholder="5r86ZkrUp2zyqjb91aSKLadHcKT54a13TBBdiJnraFqE" onChange={onChangeWalletPrivKey}></input>
      </div>
      <div className='row'>
        <div className='col-sm-6'>
          <h3>Create</h3>
          <div className="input-group">
            <span className="input-group-text">Max Supply</span>
            <input type="number" className="form-control" onChange={onChangeCMaxSupply}></input>
          </div>
          <div className="input-group">
            <span className="input-group-text">NFT price</span>
            <input type="number" className="form-control" onChange={onChangeCNFTPrice}></input>
          </div>
          <div>
            Sealed: <input type="checkbox" onChange={onChangeCSealed}></input>
          </div>
          {
            can_create ? 
              <button type="button" className="btn btn-primary" onClick={createINFTS}>Create</button>
              :
          <button type="button" className="btn btn-primary" onClick={createINFTS} disabled>Create</button>
          }
                    
        </div>
        <div className='col-sm-6'>
          <h3>Modify</h3>
          <div className="input-group">
            <span className="input-group-text">Max Supply</span>
            <input type="number" className="form-control" onChange={onChangeMMaxSupply}></input>
          </div>
          <div className="input-group">
            <span className="input-group-text">NFT price</span>
            <input type="number" className="form-control" onChange={onChangeMNFTPrice}></input>
          </div>
          <div>
            Sealed: <input type="checkbox" onChange={onChangeMSealed}></input>
          </div>
          {
            !can_create ? 
              <button type="button" className="btn btn-primary" onClick={modifyINFTS}>Modify</button>
              :
          <button type="button" className="btn btn-primary" onClick={modifyINFTS} disabled>Modify</button>
          }
          <h3>Get Fee</h3>
          <div className="input-group">
            <span className="input-group-text">Fee Receiver Priv Key</span>
            <input type="text" className="form-control" placeholder="5r86ZkrUp2zyqjb91aSKLadHcKT54a13TBBdiJnraFqE" onChange={onChangeFeeReceiverKey}></input>
          </div>
          <button type="button" className="btn btn-primary" onClick={getFeeINFTS}>Get Fee</button>

        </div>
          Whitelisted: {is_whitelisted ? "true" : "false"}
          <div className="input-group">
            <span className="input-group-text">Whitelist Account Pubkey</span>
            <input type="text" className="form-control" placeholder="5r86ZkrUp2zyqjb91aSKLadHcKT54a13TBBdiJnraFqE" onChange={onChangeWhitelistAccountPubkey}></input>
          </div>
          <div>
            true or false: <input type="checkbox" onChange={onChangeWSealed}></input>
          </div>
          <button type="button" className="btn btn-primary" onClick={createIWhitelist}>Whitelist.</button>

      </div>
    </div>
  );
}

const AppWithProvider = () => (
  <App/>
)

export default AppWithProvider;

