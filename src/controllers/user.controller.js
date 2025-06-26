import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken}
    } catch (error){
        throw new ApiError(500,"Error Generating Tokens")
    }
}

const registerUser = asyncHandler( async (req,res)=> {
    //get user details from frontend-x
    //validation - not empty-x
    //check if user already exists: username, email-x
    //check for imges, check for avatar -x
    //upload them to cloudinary -x
    // create user object - create entry in db -x
    // remove password and refresh token field from response -x
    //check for user creation -x
    //return res -x
    const { fullName, email, username, password }=req.body

    if(
        [fullName, email, username, password].some((field) => field?.trim()==="")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existingUser = await User.findOne({
        $or:[{ username }, { email }]
    })

    if(existingUser) {
        throw new ApiError(409, "User with same username or email already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverimage[0]?.path

    let coverImageLocalPath

    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar) {
        throw new ApiError(400, "Avatar is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverimage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered succcessfuly")
    )    

})

const loginUser = asyncHandler( async(req,res) => {
    //password and username 
    //check if user exists
    //check if password is correct
    //generate acess token
    //send cookies

    const {email, username, password} = req.body;
    if(!username && !email) {
        throw new ApiError(400, "Either Username or Email is required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    });

    if(!user) {
        throw new ApiError(404, "User not found")
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid) {
        throw new ApiError(404, "Incorrect password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure:true
    }

    return res
        .status(200)
        .cookie("acessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                }
            )
        )

})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res 
        .status(200)
        .clearCookie("accessToken", "", options)
        .clearCookie("refreshToken", "", options)
        .json(new ApiResponse(200, null, "User logged out successfully"))
})

const renewSession = asyncHandler(async (req, res) => {
    //get the refresh token from cookies or body
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    //check if you actually got it or not
    if(!incomingRefreshToken) {
        throw new ApiError(400, "Refresh token not provided");
    }
    try {
        //verify the refresh Token
        const decodedToken =jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        //find if the user exists
        const user = await User.findById(decodedToken?._id);
        if(!user) {
            throw new ApiError(404, "User not found");
        }
        //check if the incoming token is the same as the token in the db
        if(incomingRefreshToken!==user.refreshToken) {
            throw new ApiError(401, "Invalid refresh token");
        }
        //genertate new access and refresh tokens
        const { accessToken, renewedRefreshToken } = await generateAccessAndRefreshTokens(user._id);

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refeshToken", renewedRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: renewedRefreshToken
                    },
                    "Session renewed successfully",
                )
            )

    } catch (error) {
        throw new ApiError(401, error?.message || "Unauthorized access");
    }
})

export { registerUser, loginUser, logoutUser, renewSession }