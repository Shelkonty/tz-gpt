const axios = require('axios');

exports.getChatGPTResponse = async (message) => {
        const payload = {
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: message
                }
            ],
            temperature: 0.7
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPEN_API_KEY }`
        };

        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            payload,
            { headers }
        );

        return response.data.choices[0].message.content;
};