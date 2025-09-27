import express from "express";
import { supabase } from "../db/supabase.js";

const router = express.Router();

router.get("/verify-shipment", async (req, res) => {
  try {
    const { shipmentId, tokenId } = req.query;

    if (!shipmentId && !tokenId) {
      return res.status(400).json({
        success: false,
        error: "Please provide shipmentId and tokenId",
      });
    }

    let query = supabase.from("shipments").select("*");

    if (shipmentId) {
      query = query.eq("shipment_id", shipmentId);
    } else if (tokenId) {
      query = query.eq("token_id", tokenId);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    // Shipment found
    res.json({
      success: true,
      shipment: data[0],
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
