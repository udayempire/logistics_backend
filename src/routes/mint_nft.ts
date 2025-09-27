import express from "express";
import {
  AccountId,
  PrivateKey,
  Client,
  TokenCreateTransaction,
  TokenType,
} from "@hashgraph/sdk";
import "dotenv/config";

const router = express.Router();

router.post("/create-nft", async (req, res) => {
  let client: Client | null = null;

  try {
    const { tokenName, tokenSymbol } = req.body;

    if (!tokenName || !tokenSymbol) {
      return res.status(400).json({
        success: false,
        error: "tokenName and tokenSymbol are required in request body",
      });
    }

    // Load credentials
    const MY_ACCOUNT_ID = AccountId.fromString(process.env.MY_ACCOUNT_ID!);
    const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(process.env.MY_PRIVATE_KEY!);

    // Setup client
    client = Client.forTestnet();
    client.setOperator(MY_ACCOUNT_ID, MY_PRIVATE_KEY);

    // Create NFT token
    const txTokenCreate = await new TokenCreateTransaction()
      .setTokenName(tokenName)
      .setTokenSymbol(tokenSymbol)
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(MY_ACCOUNT_ID)
      .setSupplyKey(MY_PRIVATE_KEY)
      .freezeWith(client);

    // Sign & execute
    const signTxTokenCreate = await txTokenCreate.sign(MY_PRIVATE_KEY);
    const txTokenCreateResponse = await signTxTokenCreate.execute(client);

    // Receipt
    const receiptTokenCreateTx = await txTokenCreateResponse.getReceipt(client);
    const tokenId = receiptTokenCreateTx.tokenId;
    const statusTokenCreateTx = receiptTokenCreateTx.status;
    const txTokenCreateId = txTokenCreateResponse.transactionId.toString();

    res.json({
      success: true,
      status: statusTokenCreateTx.toString(),
      transactionId: txTokenCreateId,
      hashscanUrl: `https://hashscan.io/testnet/tx/${txTokenCreateId}`,
      tokenId: tokenId?.toString(),
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
