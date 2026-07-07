/**
 * Multer = middleware responsible for handling file uploads in Express + process files sent from HTML forms
 * Flow:
 * User uploads a file
 * Multer receives the file
 * Decides where to save it
 * Decides what filename to use
 * Writes file to disk
 * Controller receives information about the file
 */

const multer = require("multer");
const path = require("path");

/**
 * Configure storage
 * Store uploaded files on computer's disk
 */
const storage = multer.diskStorage({
  // where the file should be saved
  // req = Express req
  // file = information about the file: { originalName, mimetype, size }
  // cb = callback function: cb format = cb(error, destination)
  destination: (req, file, cb) => {
    // save location
    // format: cb(error, destination), destination: save files inside project/uploads/
    cb(null, "uploads/");
  },
  fileName: (req, file, cb) => {
    // generate a file name from original name
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalName)}`;

    cb(null, name);
  },
});

/**
 * Upload middleware
 * fileSize = max file size = 10 MB
 */
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

module.exports = upload;
