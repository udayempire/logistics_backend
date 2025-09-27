import express from "express";
import { supabase } from "../db/supabase.js";

const router = express.Router();

router.get("/verify-shipment", async (req, res) => {
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

    res.json({
      success: true,
      shipment,
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
