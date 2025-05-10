const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

app.get('/test', (req, res) => {
    res.json({ message: 'Сервер работает!' });
});

app.post('/api/chat', (req, res) => {
    console.log('Получен запрос на /api/chat');
    console.log('Тело запроса:', req.body);

    const { message } = req.body || {};

    res.json({
        success: true,
        message: 'Запрос получен',
        response: `Вы отправили: "${message || 'пустое сообщение'}"`
    });
});

app.get('/', (req, res) => {
    res.send(`
    <html>
      <head><title>Тестовый сервер</title></head>
      <body>
        <h1>Сервер работает!</h1>
        <p>Доступные маршруты:</p>
        <ul>
          <li><a href="/test">/test</a> - тестовый GET маршрут</li>
          <li>/api/chat - тестовый POST маршрут (используйте Postman или cURL)</li>
        </ul>
      </body>
    </html>
  `);
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на порту ${PORT}`);
    console.log(`Открыть в браузере: http://localhost:${PORT}`);
});