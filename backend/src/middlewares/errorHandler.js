/**
 * Middleware centralizado de tratamento de erros
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Erro na requisição:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    time: new Date().toISOString()
  });

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'O arquivo ultrapassa o tamanho máximo permitido de 25MB.'
      });
    }
    return res.status(400).json({
      success: false,
      error: `Erro no upload de arquivo: ${err.message}`
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Ocorreu um erro interno no servidor.';

  return res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

/**
 * Middleware para rotas 404
 */
function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.originalUrl}`
  });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
