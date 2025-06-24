import { User } from '../models/user.model.js';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/apiError.js';
import { asyncHandler } from 'express-async-handler';

export const verifyJWT = asyncHandler( async (req, res, next)=> {
    try {
        const token = req.cookies?.acessToken ||req.header("Authorization")?.replace("Bearer ","");
        if (!token){
            throw new ApiError(401, "Unauthorized access");
        }
    
        const decodedToken = jwt.verify(token,process.env.ACESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refeshToken")
    
        if(!user) {
            throw new ApiError(401, "Invalid Acess Token")
        }
    
        req.user = user;
    
        next();
    } catch (error) {
        throw new ApiError(401, error.message || "Unauthorized access");
    }

})