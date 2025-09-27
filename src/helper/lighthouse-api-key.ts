import axios from 'axios'
import { ethers } from 'ethers'
import lighthouse from '@lighthouse-web3/sdk'

const publicKey = process.env.PUBLIC_KEY!
const privateKey = process.env.PRIVATE_KEY!

const signAuthMessage = async (privateKey: any, verificationMessage: any) => {
  const signer = new ethers.Wallet(privateKey)
  const signedMessage = await signer.signMessage(verificationMessage)
  return (signedMessage)
}

const getApiKey = async () => {
  const wallet = {
    publicKey,
    privateKey
  }
  const verificationMessage = (
    await axios.get(
      `https://api.lighthouse.storage/api/auth/get_message?publicKey=${wallet.publicKey}`
    )
  ).data
  const signedMessage = await signAuthMessage(wallet.privateKey, verificationMessage)
  const response = await lighthouse.getApiKey(wallet.publicKey, signedMessage)
  console.log(response)
}

getApiKey()