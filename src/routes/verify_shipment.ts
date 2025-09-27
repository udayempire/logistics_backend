import express from "express";
import { supabase } from "../db/supabase.js";
import {
  AccountId,
  PrivateKey,
  Client,
  TransferTransaction,
  AccountBalanceQuery,
} from "@hashgraph/sdk";

const router = express.Router();

router.get("/verify-shipment", async (req, res) => {
  let client: Client | null = null;

  try {
    const { shipmentId, tokenId, location } = req.query;

    if (!shipmentId && !tokenId) {
      return res.status(400).json({
        success: false,
        error: "Please provide shipmentId or tokenId",
      });
    }

    let query = supabase.from("shipments").select("*");
    if (shipmentId) query = query.eq("shipment_id", shipmentId);
    if (tokenId) query = query.eq("token_id", tokenId);

    const { data, error: selectError } = await query;
    if (selectError) throw selectError;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const shipment = data[0];

    if (location) {
      const { data: updateData, error: updateError } = await supabase
        .from("shipments")
        .update({ current_location: location })
        .eq("shipment_id", shipment.shipment_id);

      if (updateError) console.error("Error updating location:", updateError);
      else shipment.current_location = location;
    }

    if (location && shipment.receiver === location) {
      const nftTokenId = tokenId || shipment.token_id;
      if (!nftTokenId) {
        return res.status(400).json({
          success: false,
          error: "Token ID is required for NFT transfer",
        });
      }

      client = Client.forTestnet();
      client.setOperator(process.env.MY_ACCOUNT_ID!, process.env.MY_PRIVATE_KEY!);
      const treasuryId = AccountId.fromString(process.env.MY_ACCOUNT_ID!);
      const treasuryKey = PrivateKey.fromStringECDSA(process.env.MY_PRIVATE_KEY!);
      const receiverId = AccountId.fromString(shipment.receiver_account_id);

      const balanceBefore = await new AccountBalanceQuery()
        .setAccountId(treasuryId)
        .execute(client);

      console.log(
        `Treasury NFT balance: ${(balanceBefore.tokens?.get(nftTokenId) ?? 0).toString()}`
      );

      const transferTx = new TransferTransaction()
        .addNftTransfer(nftTokenId, 1, treasuryId, receiverId);

      const transferTxFrozen = await transferTx.freezeWith(client);
      const transferTxSigned = await transferTxFrozen.sign(treasuryKey);
      const transferTxResponse = await transferTxSigned.execute(client);
      const transferReceipt = await transferTxResponse.getReceipt(client);

      console.log(`NFT transfer status: ${transferReceipt.status}`);

      await supabase
        .from("shipments")
        .update({ 
          current_owner: shipment.receiver,
          status: 'Delivered'
        })
        .eq("shipment_id", shipment.shipment_id);
    }

    res.json({
      success: true,
      shipment,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (client) client.close();
  }
});

export default router;
