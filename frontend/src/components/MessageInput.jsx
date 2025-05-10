import React, { useState, useRef } from 'react';
import { FaMicrophone, FaStopCircle, FaPaperPlane } from 'react-icons/fa';
import axios from 'axios';

const MessageInput = ({ onSendMessage, loading }) => {
    const [message, setMessage] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [audioStatus, setAudioStatus] = useState('');
    const [audioError, setAudioError] = useState('');
    const textareaRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);

    const handleInputChange = (e) => {
        setMessage(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!loading && message.trim()) {
            onSendMessage(message);
            setMessage('');
            setTimeout(() => textareaRef.current?.focus(), 0);
        }
    };

    const startRecording = async () => {
        try {
            audioChunksRef.current = [];
            setAudioStatus('');
            setAudioError('');

            console.log('Запрос доступа к микрофону...');
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            const options = {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000
            };

            try {
                const mediaRecorder = new MediaRecorder(stream, options);
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        audioChunksRef.current.push(event.data);
                    }
                };

                mediaRecorder.onstop = async () => {
                    setIsRecording(false);
                    setAudioStatus('Обработка записи...');

                    if (audioChunksRef.current.length === 0) {
                        setAudioError('Не удалось записать аудио. Проверьте микрофон.');
                        setAudioStatus('');
                        return;
                    }

                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    console.log('Размер аудио:', Math.round(audioBlob.size / 1024), 'КБ');

                    const audioUrl = URL.createObjectURL(audioBlob);
                    console.log('Записанное аудио:', audioUrl);

                    const formData = new FormData();
                    formData.append('audio', audioBlob, 'recording.webm');

                    try {
                        console.log('Отправка аудио на сервер...');
                        const response = await axios.post('http://localhost:5000/api/speech-to-text', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                            timeout: 30000
                        });

                        console.log('Ответ сервера:', response.data);

                        if (response.data && response.data.text) {
                            setMessage(prev => {
                                const newText = (prev + ' ' + response.data.text).trim();
                                return newText;
                            });
                            setAudioStatus('');
                        } else {
                            setAudioError('Не удалось распознать речь в записи.');
                            setAudioStatus('');
                        }
                    } catch (error) {
                        console.error('Ошибка отправки аудио:', error);

                        let errorMessage = 'Ошибка при отправке аудио на сервер.';

                        if (error.response) {
                            errorMessage = `Ошибка сервера: ${error.response.status} - ${error.response.data.message || error.message}`;
                        } else if (error.request) {
                            errorMessage = 'Сервер не отвечает. Проверьте подключение.';
                        }

                        setAudioError(errorMessage);
                        setAudioStatus('');
                    }

                    stream.getTracks().forEach(track => track.stop());
                };
ь
                mediaRecorder.start(100);
                setIsRecording(true);
                console.log('Запись запущена');
            } catch (recorderError) {
                console.error('Ошибка создания MediaRecorder:', recorderError);
                setAudioError(`Ошибка создания записи: ${recorderError.message}`);
                stream.getTracks().forEach(track => track.stop());
            }
        } catch (error) {
            console.error('Ошибка доступа к микрофону:', error);

            if (error.name === 'NotAllowedError') {
                setAudioError('Доступ к микрофону запрещен. Пожалуйста, разрешите доступ в настройках браузера.');
            } else if (error.name === 'NotReadableError') {
                setAudioError('Микрофон занят другим приложением или недоступен.');
            } else {
                setAudioError(`Не удалось получить доступ к микрофону: ${error.message}`);
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="mt-4">
                <div className="flex items-center">
                    <textarea
                        ref={textareaRef}
                        className="flex-grow p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        rows="2"
                        placeholder="Введите сообщение..."
                        value={message}
                        onChange={handleInputChange}
                        disabled={loading}
                    />

                    <button
                        type="button"
                        onClick={toggleRecording}
                        className={`p-3 ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                        disabled={loading}
                        title={isRecording ? "Остановить запись" : "Начать запись голоса"}
                    >
                        {isRecording ? <FaStopCircle /> : <FaMicrophone />}
                    </button>

                    <button
                        type="submit"
                        className="p-3 bg-indigo-500 text-white rounded-r-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading || !message.trim()}
                        title="Отправить сообщение"
                    >
                        <FaPaperPlane />
                    </button>
                </div>
            </form>

            {isRecording && (
                <div className="mt-2 text-sm text-indigo-500 animate-pulse flex items-center">
                    <span className="mr-2">Идет запись...</span>
                    <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce"></div>
                        <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce delay-150"></div>
                        <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce delay-300"></div>
                    </div>
                </div>
            )}

            {audioStatus && !isRecording && (
                <div className="mt-2 text-sm text-gray-500">
                    {audioStatus}
                </div>
            )}

            {audioError && (
                <div className="mt-2 text-sm text-red-500">
                    {audioError}
                </div>
            )}
        </div>
    );
};

export default MessageInput;