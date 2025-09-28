import express from "express";
import cors from "cors";
import mintNft from "./routes/mint_nft.js";
import verifyShipment from './routes/verify_shipment.js';
import checkAllShipments from './routes/check-all-shipments.js';

const app = express();
app.use(cors());
app.use(express.json());


app.use("/api", mintNft);
app.use("/api", verifyShipment);
app.use("/api", checkAllShipments);

app.listen(4000, () => console.log("Server running on port 4000"));
