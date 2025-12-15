import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads', req.body.sessionId);
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        if (file.fieldname === 'mindFile') cb(null, 'targets.mind');
        else if (file.fieldname === 'videoFile') cb(null, 'video.mp4');
        else cb(null, file.originalname);
    }
});

const upload = multer.fields([{ name: 'mindFile' }, { name: 'videoFile' }]);

app.post('/create-experience', (req, res) => {
    const sessionId = uuidv4();
    req.body.sessionId = sessionId;
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ error: err.message });
        try {
            const deployUrl = `${req.protocol}://${req.get('host')}`;
            const viewerUrl = `${deployUrl}/viewer.html?id=${sessionId}`;
            const qrCodeData = await QRCode.toDataURL(viewerUrl);
            res.json({ success: true, qrCode: qrCodeData, viewerUrl: viewerUrl });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

app.listen(port, () => console.log(`Server running on port ${port}`));
