import express from "express";
import {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
} from "@hashgraph/sdk";
import "dotenv/config";
import lighthouse from "@lighthouse-web3/sdk";
import { supabase } from "../db/supabase.js";

const router = express.Router();

router.post("/create-nft", async (req, res) => {
  let client: Client | null = null;

  try {
    const { tokenName, tokenSymbol, shipmentId, from, to, contents } = req.body;

    if (!tokenName || !tokenSymbol || !shipmentId || !from || !to || !contents) {
      return res.status(400).json({
        success: false,
        error: "Missing fields",
      });
    }

    const MY_ACCOUNT_ID = AccountId.fromString(process.env.MY_ACCOUNT_ID!);
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(
      process.env.MY_PRIVATE_KEY!
    );

    client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    const shipmentData = {
      shipmentId,
      from,
      to,
      contents,
      createdBy: MY_ACCOUNT_ID.toString(),
      createdAT: Date.now()
    };

    const apiKey = process.env.LIGHTHOUSE_API_KEY!;
    const name = `shipment-${shipmentData.shipmentId}`;
    const text = JSON.stringify(shipmentData);

    const lighthouseResp = await lighthouse.uploadText(text, apiKey, name);
    const shipmentCID = lighthouseResp.data.Hash;

    console.log("Shipment uploaded to Lighthouse/IPFS:", shipmentCID);

    const tokenCreateTx = await new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setSupplyType(TokenSupplyType.Finite)
      .setMaxSupply(1)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setSupplyKey(MY_PRIVATE_KEY)
      .freezeWith(client);

    const tokenCreateSign = await tokenCreateTx.sign(MY_PRIVATE_KEY);
    const tokenCreateSubmit = await tokenCreateSign.execute(client);
    const tokenCreateReceipt = await tokenCreateSubmit.getReceipt(client);

    const tokenId = tokenCreateReceipt.tokenId?.toString();

    const tokenMintTx = await new TokenMintTransaction()
      .setTokenId(tokenId!)
      .setMetadata([Buffer.from(`ipfs://${shipmentCID}/shipment.json`)])
      .freezeWith(client);

    const tokenMintSign = await tokenMintTx.sign(MY_PRIVATE_KEY);
    const tokenMintSubmit = await tokenMintSign.execute(client);
    const tokenMintReceipt = await tokenMintSubmit.getReceipt(client);

    const { data, error } = await supabase.from("shipments").insert([
      {
        shipment_id: shipmentId,
        token_id: tokenId,
        nft_mint_tx_id: tokenMintSubmit.transactionId.toString(),
        shipment_cid: `ipfs://${shipmentCID}/shipment.json`,
        sender: from,
        receiver: to,
        contents,
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
    } else {
      console.log("Shipment saved in DB:", data);
    }

    res.json({
      success: true,
      shipmentId,
      from,
      to,
      contents,
      tokenId,
      nftMintTxId: tokenMintSubmit.transactionId.toString(),
      shipmentCID: `ipfs://${shipmentCID}/shipment.json`,
      hashscanMintUrl: `https://hashscan.io/testnet/tx/${tokenMintSubmit.transactionId.toString()}`,
    });

  } catch (error: any) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create NFT",
    });
  } finally {
    if (client) client.close();
  }
});

export default router;
