import express from "express";
import { supabase } from "../db/supabase.js";

const router = express.Router();

// GET route to fetch all transactions/shipments
router.get("/all-shipments", async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      startDate, 
      endDate,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Calculate offset for pagination
    const offset = (Number(page) - 1) * Number(limit);

    // Build the query
    let query = supabase
      .from("shipments")
      .select("*", { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    if (startDate) {
      query = query.gte("created_at", startDate);
    }

    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    // Apply sorting
    query = query.order(sortBy as string, { ascending: sortOrder === 'asc' });

    // Apply pagination
    query = query.range(offset, offset + Number(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / Number(limit));
    const hasNextPage = Number(page) < totalPages;
    const hasPrevPage = Number(page) > 1;

    // Transform data to include additional transaction info
    const transactions = data?.map(shipment => ({
      ...shipment,
      // Add Hashscan URLs for easy transaction viewing
      mintTxUrl: shipment.nft_mint_tx_id 
        ? `https://hashscan.io/testnet/tx/${shipment.nft_mint_tx_id}` 
        : null,
      // Add IPFS metadata URL
      metadataUrl: shipment.shipment_cid,
      // Format dates
      created_at: shipment.created_at ? new Date(shipment.created_at).toISOString() : null,
      updated_at: shipment.updated_at ? new Date(shipment.updated_at).toISOString() : null
    })) || [];

    res.json({
      success: true,
      data: transactions,
      pagination: {
        currentPage: Number(page),
        totalPages,
        totalItems: count || 0,
        itemsPerPage: Number(limit),
        hasNextPage,
        hasPrevPage
      },
      filters: {
        status: status || null,
        startDate: startDate || null,
        endDate: endDate || null,
        sortBy,
        sortOrder
      }
    });

  } catch (error: any) {
    console.error("Error fetching shipments:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch shipments"
    });
  }
});

// GET route to fetch transaction statistics
router.get("/shipment-stats", async (req, res) => {
  try {
    // Get total count
    const { count: totalCount } = await supabase
      .from("shipments")
      .select("*", { count: 'exact', head: true });

    // Get count by status
    const { data: statusCounts } = await supabase
      .from("shipments")
      .select("status")
      .not("status", "is", null);

    // Process status counts
    const statusStats = statusCounts?.reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // Get recent transactions (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentCount } = await supabase
      .from("shipments")
      .select("*", { count: 'exact', head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    res.json({
      success: true,
      stats: {
        totalTransactions: totalCount || 0,
        recentTransactions: recentCount || 0,
        statusBreakdown: statusStats
      }
    });

  } catch (error: any) {
    console.error("Error fetching shipment stats:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch shipment statistics"
    });
  }
});

// GET route to fetch a specific transaction by ID
router.get("/shipment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { type = 'shipment_id' } = req.query; // Can search by shipment_id, token_id, or nft_mint_tx_id

    let query = supabase.from("shipments").select("*");

    switch (type) {
      case 'token_id':
        query = query.eq("token_id", id);
        break;
      case 'tx_id':
        query = query.eq("nft_mint_tx_id", id);
        break;
      default:
        query = query.eq("shipment_id", id);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found"
      });
    }

    const transaction = data[0];
    
    // Add additional info
    const enrichedTransaction = {
      ...transaction,
      mintTxUrl: transaction.nft_mint_tx_id 
        ? `https://hashscan.io/testnet/tx/${transaction.nft_mint_tx_id}` 
        : null,
      metadataUrl: transaction.shipment_cid,
      created_at: transaction.created_at ? new Date(transaction.created_at).toISOString() : null,
      updated_at: transaction.updated_at ? new Date(transaction.updated_at).toISOString() : null
    };

    res.json({
      success: true,
      data: enrichedTransaction
    });

  } catch (error: any) {
    console.error("Error fetching specific shipment:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch shipment"
    });
  }
});

export default router;
