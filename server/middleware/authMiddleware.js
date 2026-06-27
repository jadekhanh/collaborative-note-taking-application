// import jwt library
const jwt = require("jsonwebtoken");
// import User model
const user = require("../models/User");

// create middleware "protect" that sits between request and controller
// req has 3 parts: req.headers, req.body, req.params
const protect = async (req, res, next) => {
    try {
        // define a token, currently null
        let token;

        /** if Auth headers's authorization exists and valid, extract token
         * req.headers = {
         * authorization: Bearer [token]
         * contentType: application/json
         * }
         */
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split("")[1];
        }

        // if token is missing, this person isn't authorized
        if (!token) {
            return res.status(401).json({ message: "Not authorized: token not found!"});
        }

        // verify the token with signature, if valid, extract payload
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // get user id from payload
        const user = await User.findById(payload.id);

        // if user does not exists (e.g., user is deleted from database)
        if (!user) {
            return res.status(401).json({ message: "Not authorized: user not found!"});
        }

        // attach user to req so every controller can access user without querying MongoDB again
        req.user = user;

        // next function
        next();
    } catch (e) {
        return res.status(401).json({ message: "Not authorized: invalid token!"});
    }
};

// export this middleware
module.exports = { protect };