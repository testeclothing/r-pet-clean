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

// 1. Configurar onde guardar os ficheiros
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Garante que a pasta uploads/ID existe
        const uploadPath = path.join(__dirname, 'uploads', req.body.sessionId);
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Renomeia os ficheiros para o padrão esperado
        if (file.fieldname === 'mindFile') {
            cb(null, 'targets.mind');
        } else if (file.fieldname === 'videoFile') {
            cb(null, 'video.mp4');
        } else {
            cb(null, file.originalname);
        }
    }
});

// 2. CORREÇÃO: Inicializar o Multer corretamente aqui
const upload = multer({ storage: storage });

app.post('/create-experience', (req, res) => {
    // Gerar ID da sessão
    const sessionId = uuidv4();
    req.body.sessionId = sessionId;

    // 3. Definir quais campos aceitamos
    const uploadMiddleware = upload.fields([
        { name: 'mindFile', maxCount: 1 }, 
        { name: 'videoFile', maxCount: 1 }
    ]);

    // Executar o upload
    uploadMiddleware(req, res, async (err) => {
        if (err) {
            console.error("Erro no upload:", err);
            return res.status(500).json({ error: err.message });
        }

        try {
            // Verificar se os ficheiros vieram
            if (!req.files || !req.files['mindFile'] || !req.files['videoFile']) {
                throw new Error('Faltam ficheiros! Certifica-te que enviaste o .mind e o .mp4');
            }

            const deployUrl = `${req.protocol}://${req.get('host')}`;
            const viewerUrl = `${deployUrl}/viewer.html?id=${sessionId}`;
            
            // Gerar QR Code
            const qrCodeData = await QRCode.toDataURL(viewerUrl);

            res.json({
                success: true,
                qrCode: qrCodeData,
                viewerUrl: viewerUrl
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ error: error.message });
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
