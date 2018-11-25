'use strict';
const process = require('process');
console.log(`pid: ${process.pid}`);
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

// MongoURI
const mongoURI = 'mongodb://John:jefferson1776@ds261917.mlab.com:61917/jm-scholar-uploads';

// Create Mongo connection
const conn = mongoose.createConnection(mongoURI);

// Initialize gfs (GridFS Stream)
let gfs;

conn.once('open', () => {
    // Init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
});

// Create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            crypto.randomBytes(16, (err, buf) => {
                if(err) {
                    return reject(err);
                }
                const filename = buf.toString('hex') + path.extname(file.originalname);
                const fileInfo = {
                    filename: filename,
                    bucketName: 'uploads'
                };
                resolve(fileInfo);
            });
        });
    }
});

const upload = multer({ storage });

// Default view
// @route GET /
// @desc Loads form
app.get('/', (req, res) => {
    // res.render('index');
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if(!files || files.length === 0) {
            res.render('index', { files: false });
        } else {
            files.map(file => {
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
                    file.isImage = true;
                } else {
                    file.isImage = false;
                }
            });
            res.render('index', { files: files });
        }
        // Files exist
        // return res.json(files);
    });
});

// @route POST /upload
// @desc Uploads file to DB
// @note using 'file' filename from HTML
app.post('/upload', upload.single('file'), (req, res) => {
    console.log('POST received!');
    // res.json({ file: req.file });
    res.redirect('/');
});

// @route GET /files
// @desc Display all files in JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        // Check if files
        if(!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }
        // Files exist
        return res.json(files);
    });
});



// @route GET /files/:filename
// @desc Display a single file in JSON
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if files
        if(!file || file.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }
        // Files exist
        return res.json(file);
    });
});

// @route GET /image/:filename
// @desc Display image
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        // Check if files
        if(!file || file.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }

        // Check if image
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            // Read output to browser
            const readStream = gfs.createReadStream(file.filename);
            readStream.pipe(res);
        } else {
            res.status(404).json({ error: 'Not an image!' });
        }
    });
});

// @route DELETE /files/:id
// @desc Delete file
app.delete('/files/:id', (req, res) => {
    console.log(`Received request to delete file id: ${req.params.id}`);
    gfs.remove({ _id: req.params.id, root: 'uploads' }, function(err, gridFsBucket) {
        if(err) {
            return res.status(404).json({ err: err });
        }
        res.redirect('/');
    });
});

const port = 5000;

app.listen(port, () => {
    console.log(`Server started on port: ${port}`);
});
