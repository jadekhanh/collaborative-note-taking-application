// import Mongoose = a library that helps Node.js talks to MongoDB database
const mongoose = require("mongoose");

// function to connect to MongoDB database
const connectDB = async () => {
    try {
        // read database URL from .env
        const mongoUri = process.env.MONGO_URI;

        // if databse URL doesn't exist
        if (!mongoUri) {
            throw new Error("MONGO_URI is missing from environment variables!");
        }

        // create connection to MongoDB
        // await = pause this function until MongoDB responds so that it can return real database connection before proceed to next line
        const connection = await mongoose.connect(mongoUri);

        console.log(`MongoDB successfully connected: ${connection.connection.host}`);
    } catch (error) {
        console.error(`MongoDB failed to connect: ${error.message}`);
        // stops the app, error exit
        process.exit(1);
    }
};

// export the function
module.exports = connectDB;