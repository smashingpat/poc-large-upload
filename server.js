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
        extension: req.body.fileExtension,
        uploading: true,
    };
    uploadDatabase.setKey(uploadInfo.id, uploadInfo);
    uploadDatabase.save(true);
    res.writeHead(200, {
        'Content-Type': 'application/json',
    });
    res.end(JSON.stringify(uploadInfo));
});
app.post('/api/upload/push/:uploadId', (req, res) => {
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
app.post('/api/upload/end/:uploadId', (req, res, next) => {
    const uploadId = req.params.uploadId;
    const uploadInfo = uploadDatabase.getKey(uploadId);
    if (uploadInfo) {
        const updatedUploadInfo = { ...uploadInfo, uploading: false };
        uploadDatabase.setKey(uploadId, updatedUploadInfo);
        uploadDatabase.save(true);
        res.json(uploadInfo);
    } else next();
})

server.listen(3000, () => console.log('listening at :3000'));
