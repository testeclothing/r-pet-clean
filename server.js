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

// 1. Configurar Storage com ID seguro
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // AQUI ESTAVA O ERRO: Agora usamos req.customId em vez de req.body
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
    // 2. Gerar ID e guardar num local seguro
    const sessionId = uuidv4();
    req.customId = sessionId; // Guardamos aqui para o Multer ler

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
            // Validar se ficheiros existem
            if (!req.files || !req.files['mindFile'] || !req.files['videoFile']) {
                throw new Error('Faltam ficheiros (mind ou video)');
            }

            const deployUrl = `${req.protocol}://${req.get('host')}`;
            // Usamos o mesmo ID para gerar o link
            const viewerUrl = `${deployUrl}/viewer.html?id=${sessionId}`;
            
            const qrCodeData = await QRCode.toDataURL(viewerUrl);

            res.json({
                success: true,
                qrCode: qrCodeData,
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
