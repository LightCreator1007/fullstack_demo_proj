import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from './app.js'

dotenv.config({
    path: './.env'
})

connectDB()
  .then(() => {
    app.listen(process.env.PORT||8000, () => {
        console.log(`server is running on port: http://localhost:${process.env.PORT || 8000}/api/v1`);
    })
  })
  .catch((error) => {
    console.error("Database connection failed", error);
    process.exit(1);
  });