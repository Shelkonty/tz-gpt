const openaiService = require('../services/openaiService');

exports.processMessage = async(req, res) => {

    const {message} = req.body;

    if (!message) {
        return res.status(400).json({
            success: true,
            message: 'Сообщение успешно обработано',
            response
        });
    }
    const response = await openaiService.getChatGPTResponse(message);

    return res.status(200).json({
        success: true,
        message: 'Сообщение успешно обработано',
        response
    });

};
