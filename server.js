const fs = require('fs');
const path = require('path');
const uuid = require('uuid/v4');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const flatCache = require('flat-cache');

const uploadDir = path.resolve(__dirname, './uploads');
const publicDir = path.resolve(__dirname, './public');
const uploadDatabase = flatCache.load('uploads');

app.use(express.static(publicDir));
app.use(bodyParser.json({ extended: true }));
app.get('/api/uploads', (req, res) => {
    const data = uploadDatabase.all();
    res.json(Object.keys(data).map(key => data[key]));
})
app.post('/api/upload/start', (req, res, next) => {
    const uploadInfo = {
        id: uuid(),
        timestamp: Date.now(),
        uploading: true,
        extension: req.body.fileExtension
    };
    uploadDatabase.setKey(uploadInfo.id, uploadInfo);
    uploadDatabase.save();
    res.writeHead(200, {
        'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(uploadInfo));
});
app.post('/api/upload/push/:uploadId/:chunkNumber', (req, res) => {
    const uploadInfo = uploadDatabase.getKey(req.params.uploadId);
    let collectedData = ''
    req.on('data', (data) => {
        collectedData += data;
    });
    req.on('end', () => {
        const buffer = new Buffer(collectedData, 'base64');
        fs.appendFile(path.resolve(uploadDir, `${uploadInfo.id}.${uploadInfo.extension}`), buffer, (err) => {
            if (err) return next(err);
            res.json(uploadInfo);
        });
    });
});

server.listen(3000, () => console.log('listening at :3000'));
