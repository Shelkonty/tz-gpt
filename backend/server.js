const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const FormData = require('form-data');
const axios = require("axios");

dotenv.config();

const chatRoutes = require('./src/routes/chatRoutes');

const app = express();

const port = process.env.PORT || 5000;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = './temp-audio';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        cb(null, 'audio-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json());

app.use('/api', chatRoutes);

async function recognizeWithWhisperAPI(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error('Файл не найден:', filePath);
            return "Ошибка: аудиофайл не найден.";
        }

        const fileStats = fs.statSync(filePath);
        const fileSizeMB = fileStats.size / (1024 * 1024);
        console.log(`Размер файла: ${fileSizeMB.toFixed(2)} МБ`);

        if (!process.env.OPEN_API_KEY) {
            console.error('API ключ OpenAI не найден в переменных окружения.');
            return "Ошибка: отсутствует API ключ OpenAI.";
        }

        console.log('Отправка аудио в Whisper API...');

        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('model', 'whisper-1');
        formData.append('language', 'ru');

        console.log('Запрос отправлен в Whisper API');
        const response = await axios.post(
            'https://api.openai.com/v1/audio/transcriptions',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'Authorization': `Bearer ${process.env.OPEN_API_KEY}`
                },
                maxContentLength: Infinity,
                maxBodyLength: Infinity,
                timeout: 30000
            }
        );

        console.log('Получен ответ от Whisper API');
        return response.data.text;
    } catch (error) {
        console.error('Ошибка при использовании Whisper API:');

        if (error.response) {
            console.error('Статус ошибки:', error.response.status);
            console.error('Ответ API:', JSON.stringify(error.response.data, null, 2));

            if (error.response.status === 401) {
                return "Ошибка авторизации: неверный API ключ OpenAI.";
            } else if (error.response.status === 400) {
                return `Ошибка в запросе: ${error.response.data.error?.message || 'неизвестная ошибка'}`;
            } else if (error.response.status === 429) {
                return "Превышен лимит запросов к API OpenAI. Попробуйте позже.";
            }
        } else if (error.request) {
            console.error('Ошибка соединения:', error.message);
            return "Ошибка соединения с API OpenAI. Проверьте подключение к интернету.";
        } else {
            console.error('Ошибка:', error.message);
        }

        return `Ошибка при распознавании речи: ${error.message}`;
    }
}

app.post('/api/speech-to-text', upload.single('audio'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Аудиофайл не получен' });
        }

        console.log('Получен аудиофайл:', req.file.path);

        const recognizedText = await recognizeWithWhisperAPI(req.file.path);

        try {
            fs.unlinkSync(req.file.path);
        } catch (err) {
            console.error('Ошибка при удалении файла:', err);
        }

        return res.status(200).json({
            success: true,
            text: recognizedText
        });
    } catch (error) {
        console.error('Ошибка при обработке аудио:', error);

        if (req.file && fs.existsSync(req.file.path)) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error('Ошибка при удалении файла:', err);
            }
        }

        return res.status(500).json({
            success: false,
            message: 'Ошибка при распознавании речи',
            error: process.env.NODE_ENV === 'development' ? error.message : 'Внутренняя ошибка сервера'
        });
    }
});

app.get('/test', (req, res) => {
    res.json({ message: 'Сервер работает!' });
});

app.post('/api/chat-test', (req, res) => {
    console.log('Получен запрос на /api/chat-test');
    console.log('Тело запроса:', req.body);
    res.json({
        success: true,
        message: 'Тестовый ответ от сервера',
        response: 'Это тестовый ответ'
    });
});

app.use((err, req, res, next) => {
    console.log(err);
    res.status(500).json({
        success: false,
        message: err.message,
        error: process.env.NODE_ENV === 'development' ? err.stack : {}
    });
});

app.listen(port, () => {
    console.log(`Listening on port ${port}`);
});