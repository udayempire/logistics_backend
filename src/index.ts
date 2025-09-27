import express from "express";
import mintNft from "./routes/mint_nft.js";
import verifyShipment from './routes/verify_shipment.js'

const app = express();
app.use(express.json());

app.use("/api", mintNft);
app.use("/api", verifyShipment);

app.listen(3000, () => console.log("Server running on port 3000"));
