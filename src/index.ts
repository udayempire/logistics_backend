import express from "express";
import tokenRoutes from "./routes/mint_nft.js";

const app = express();
app.use(express.json());

app.use("/api", tokenRoutes);

app.listen(3000, () => console.log("Server running on port 3000"));
