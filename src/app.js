import express from "express"
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({limit: "16kb"})) //handling json data
app.use(express.urlencoded({extended: true, limit: "16kb"})) //handle encoded urls with a limit, extended ensures that nested objects are parsed correctly
app.use(express.static("public")); //serve static files from the public directory

app.use(cookieParser());

//routes import
import userRouter from "./routes/user.routes.js"

//routes
app.use("/api/v1/users", userRouter)

export default app;