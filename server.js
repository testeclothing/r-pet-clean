import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(express.json());

// Configuração do Multer (Upload)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads', req.customId);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        if (file.fieldname === 'mindFile') {
            cb(null, 'targets.mind');
        } else if (file.fieldname === 'videoFile') {
            cb(null, 'video.mp4');
        } else {
            cb(null, file.originalname);
        }
    }
});

const upload = multer({ storage: storage });

app.post('/create-experience', (req, res) => {
    // 1. Gerar ID Único
    const sessionId = uuidv4();
    req.customId = sessionId; 

    const uploadMiddleware = upload.fields([
        { name: 'mindFile', maxCount: 1 }, 
        { name: 'videoFile', maxCount: 1 }
    ]);

    uploadMiddleware(req, res, async (err) => {
        if (err) {
            console.error("Erro Upload:", err);
            return res.status(500).json({ error: err.message });
        }

        try {
            // Validar Ficheiros
            if (!req.files || !req.files['mindFile'] || !req.files['videoFile']) {
                throw new Error('Faltam ficheiros (mind ou video)');
            }

            const deployUrl = `${req.protocol}://${req.get('host')}`;
            // Apenas devolvemos o URL. O frontend gera o QR Code.
            const viewerUrl = `${deployUrl}/viewer.html?id=${sessionId}`;
            
            res.json({
                success: true,
                viewerUrl: viewerUrl
            });

        } catch (error) {
            console.error("Erro Logica:", error);
            res.status(500).json({ error: error.message });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
