import React, { useRef, useEffect } from 'react';

const MessageDisplay = ({ messages, loading, speechSynthesisEnabled, selectedVoice }) => {
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (speechSynthesisEnabled && messages.length > 0 && 'speechSynthesis' in window) {
            const lastMessage = messages[messages.length - 1];

            if (lastMessage.role === 'assistant') {
                if (window.speechSynthesis.speaking) {
                    window.speechSynthesis.cancel();
                }

                const speech = new SpeechSynthesisUtterance(lastMessage.content);

                if (selectedVoice) {
                    speech.voice = selectedVoice;
                }

                speech.lang = 'ru-RU';

                speech.rate = 1;

                speech.volume = 1;

                speech.onerror = (event) => {
                    console.error('Ошибка синтеза речи:', event);
                };

                window.speechSynthesis.speak(speech);
            }
        }
    }, [messages, speechSynthesisEnabled, selectedVoice]);

    const formatMessage = (content) => {
        let parts = content.split(/```([^`]+)```/);

        if (parts.length > 1) {
            return parts.map((part, index) => {
                if (index % 2 === 1) {
                    return (
                        <pre key={index} className="bg-gray-100 p-2 rounded font-mono text-sm overflow-x-auto my-2">
                            <code>{part}</code>
                        </pre>
                    );
                } else {
                    return part.split('\n').map((line, i) => (
                        <p key={`${index}-${i}`} className="mb-1">{line}</p>
                    ));
                }
            });
        } else {
            return content.split('\n').map((line, i) => (
                <p key={i} className="mb-1">{line}</p>
            ));
        }
    };

    return (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 min-h-[300px] max-h-[500px] overflow-y-auto">
            {messages.length === 0 ? (
                <div className="text-center text-gray-500 h-full flex items-center justify-center">
                    <p>Начните диалог, отправив сообщение ниже</p>
                </div>
            ) : (
                messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`mb-4 p-3 rounded-lg ${
                            msg.role === 'user'
                                ? 'bg-indigo-100 ml-auto max-w-[80%]'
                                : 'bg-white border border-gray-200 mr-auto max-w-[80%]'
                        }`}
                    >
                        <div className="text-xs text-gray-500 mb-1 flex justify-between">
                            <span>{msg.role === 'user' ? 'Вы' : 'Ассистент'}</span>

                            {msg.role === 'assistant' && speechSynthesisEnabled && 'speechSynthesis' in window && (
                                <button
                                    onClick={() => {
                                        if (window.speechSynthesis.speaking) {
                                            window.speechSynthesis.cancel();
                                        }

                                        const speech = new SpeechSynthesisUtterance(msg.content);
                                        if (selectedVoice) {
                                            speech.voice = selectedVoice;
                                        }
                                        speech.lang = 'ru-RU';
                                        window.speechSynthesis.speak(speech);
                                    }}
                                    className="text-xs text-indigo-500 hover:text-indigo-700"
                                    title="Озвучить сообщение"
                                >
                                    🔊
                                </button>
                            )}
                        </div>
                        <div>
                            {formatMessage(msg.content)}
                        </div>
                    </div>
                ))
            )}

            {loading && (
                <div className="flex items-center space-x-2 bg-white p-3 rounded-lg border border-gray-200 mr-auto max-w-[80%]">
                    <div className="text-xs text-gray-500">Ассистент печатает</div>
                    <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                    </div>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageDisplay;