const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '187.127.40.228',
  port: 22,
  username: 'root',
  password: 'E08059900pe@',
  readyTimeout: 15000
};

const REMOTE_DIR = '/root/nexus-chat-backend';

// Coletar recursivamente todos os arquivos de um diretório
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

const localBackendDir = path.join(__dirname, 'backend');
const localSrcDir = path.join(localBackendDir, 'src');

const filesToUpload = [
  {
    local: path.join(localBackendDir, 'package.json'),
    remote: `${REMOTE_DIR}/package.json`
  },
  {
    local: path.join(localBackendDir, 'package-lock.json'),
    remote: `${REMOTE_DIR}/package-lock.json`
  }
];

const srcFiles = getAllFiles(localSrcDir);
srcFiles.forEach((file) => {
  const relativePath = path.relative(localBackendDir, file);
  filesToUpload.push({
    local: file,
    remote: `${REMOTE_DIR}/${relativePath.replace(/\\/g, '/')}`
  });
});

console.log(`📦 Preparando envio de ${filesToUpload.length} arquivos para a VPS...`);

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ Conexão SSH estabelecida com a VPS (187.127.40.228).');

  // Criar pastas remotas necessárias
  const remoteDirs = [
    `${REMOTE_DIR}/src`,
    `${REMOTE_DIR}/src/config`,
    `${REMOTE_DIR}/src/controllers`,
    `${REMOTE_DIR}/src/middlewares`,
    `${REMOTE_DIR}/src/routes`,
    `${REMOTE_DIR}/src/socket`
  ];

  const mkdirCmd = `mkdir -p ${remoteDirs.join(' ')}`;
  conn.exec(mkdirCmd, (errDir, streamDir) => {
    if (errDir) {
      console.error('Erro ao criar diretórios na VPS:', errDir);
      conn.end();
      return;
    }

    streamDir.resume();
    streamDir.on('close', () => {
      console.log('📁 Diretórios remotos verificados e criados com sucesso.');
      console.log('🚀 Iniciando upload SFTP...');

      conn.sftp((errSftp, sftp) => {
        if (errSftp) {
          console.error('Erro SFTP:', errSftp);
          conn.end();
          return;
        }

        let uploaded = 0;

        function uploadNext() {
          if (uploaded === filesToUpload.length) {
            console.log(`\n🎉 Todos os ${uploaded} arquivos foram enviados com sucesso!`);
            console.log('🔄 Reiniciando processo no PM2 (nexus-chat-backend)...');

            const postDeployCmd = `cd ${REMOTE_DIR} && npm install --omit=dev && pm2 restart nexus-chat-backend --update-env || pm2 start src/server.js --name nexus-chat-backend`;

            conn.exec(postDeployCmd, (errCmd, streamCmd) => {
              if (errCmd) {
                console.error('Erro no comando PM2:', errCmd);
                conn.end();
                return;
              }

              streamCmd.on('data', (data) => process.stdout.write(data));
              streamCmd.on('close', (code) => {
                console.log(`\n⚡ PM2 executado com código de saída: ${code}`);

                // Testar healthcheck local na VPS
                conn.exec('curl -s http://localhost:5000/health', (errHealth, streamHealth) => {
                  let healthOutput = '';
                  if (streamHealth) {
                    streamHealth.on('data', (d) => (healthOutput += d.toString()));
                    streamHealth.on('close', () => {
                      console.log('🏥 Resposta do Healthcheck:', healthOutput);
                      conn.end();
                      process.exit(0);
                    });
                  } else {
                    conn.end();
                    process.exit(0);
                  }
                });
              });
            });
            return;
          }

          const item = filesToUpload[uploaded];
          process.stdout.write(`⬆️  Enviando [${uploaded + 1}/${filesToUpload.length}] ${path.basename(item.local)}... \r`);
          sftp.fastPut(item.local, item.remote, (errPut) => {
            if (errPut) {
              console.error(`\n❌ Falha ao enviar ${item.local}:`, errPut.message);
              conn.end();
              process.exit(1);
            }
            uploaded++;
            uploadNext();
          });
        }

        uploadNext();
      });
    });
  });
});

conn.on('error', (err) => {
  console.error('❌ Erro de conexão SSH:', err.message);
  process.exit(1);
});

conn.connect(SSH_CONFIG);
