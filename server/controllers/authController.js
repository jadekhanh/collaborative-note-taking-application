// import jwt library and User model
const jwt = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Create a jwt after login or registration
 * @param = userId
 */
const generateToken = (userId) => {
    return jwt.sign({id: userId}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
};

/**
 * Register a new user
 */
const register = async (req, res) => {
    try {
        // extract username, email, password from req.body
        const { username, email, password } = req.body;

        // if username, email, or password field is missing
        if (!username || !email || !password) {
            // 400 = bad request
            return res.status(400).json({ message: "Please fill out all required fields!"});
        }

        // check if a user with this email alreadye exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // 409 = conflict
            return res.status(409).json({ message: "Email already in use"});
        }

        // create a new user
        const user = await User.create({ username, email, password });

        // generates token
        const token = generateToken(user.id);

        // 201 = created
        return res.status(201).json({ message: "Registration success!", token, user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl} });
    } catch (error) {
        // 500 = internal server error
        return res.status(500).json({ message: "Registration failed!", error: error.message});
    }
};

/**
 * Login a user
 */
const login = async (req, res) => {
    try {
        // extract email and password from req.body
        const { email, password } = req.body;

        // if email or password field is missing
        if (!email || !password) {
            // 400 = bad request
            return res.status(400).json({ message: "Please fill out all required fields!"});
        }

        // get user from email
        const user = await User.findOne({ email }).select("+password"); // include password

        // if user with this email doesn't exist
        if (!user) {
            // 401 = unauthorized
            return res.status(401).json({message: "Invalid email or password"});
        }

        // check if entered password matches with this user's password
        const passwordMatch = await user.comparePassword(password);
        if (!passwordMatch) {
            return res.status(401).json({message: "Invalid email or password"});
        }

        // generates token
        const token = generateToken(user.id);

        // 200 = ok
        return res.status(200).json({ message: "Login success!", token, user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl } });
    } catch (error) {
        // 500 = internal server error
        return res.status(500).json({ message: "Login failed!", error: error.message});
    }

};

/**
 * Returns a logged-in user
 */
const getMe = async (req, res) => {
    // during protect() middleware, req saves user field
    return res.status(200).json({ user: req.user });
};

// exports 3 functions
module.exports = {register, login, getMe};