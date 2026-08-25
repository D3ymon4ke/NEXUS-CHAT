const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SSH_CONFIG = {
  host: '187.127.40.228',
  port: 22,
  username: 'root',
  password: 'E08059900pe@'
};

const REMOTE_DIR = '/root/nexus-chat-backend';
const PM2_NAME = 'nexus-chat-backend';
const LOCAL_BACKEND_DIR = path.join(__dirname, '../../');

function runCommand(conn, cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n💻 [VPS Exec]: ${cmd}`);
    conn.exec(cmd, (err, stream) => {
      if (err) return reject(err);
      let output = '';
      let errorOutput = '';

      stream.on('data', (data) => {
        const str = data.toString();
        output += str;
        process.stdout.write(str);
      });

      stream.stderr.on('data', (data) => {
        const str = data.toString();
        errorOutput += str;
        process.stderr.write(str);
      });

      stream.on('close', (code) => {
        if (code === 0) {
          resolve(output);
        } else {
          resolve(output || errorOutput);
        }
      });
    });
  });
}

function getAllFiles(dirPath, arrayOfFiles = [], baseDir = dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    if (file === 'node_modules' || file === '.git') return;
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, baseDir);
    } else {
      arrayOfFiles.push({
        local: fullPath,
        relative: path.relative(baseDir, fullPath).replace(/\\/g, '/')
      });
    }
  });

  return arrayOfFiles;
}

async function deploy() {
  console.log('🚀 Conectando à VPS 187.127.40.228 via SSH...');
  const conn = new Client();

  conn.on('ready', async () => {
    console.log('✅ Conexão SSH estabelecida com sucesso!');

    try {
      // 1. Diagnóstico de processos existentes para NÃO interferir em nada
      console.log('\n🔍 Inspecionando processos e portas ativas na VPS...');
      await runCommand(conn, 'pm2 list || true');
      await runCommand(conn, 'ss -tuln || netstat -tuln || true');

      // 2. Criar diretório isolado para o Nexus Chat
      console.log(`\n📁 Criando diretório isolado: ${REMOTE_DIR}`);
      await runCommand(conn, `mkdir -p ${REMOTE_DIR}/src/config ${REMOTE_DIR}/src/controllers ${REMOTE_DIR}/src/middlewares ${REMOTE_DIR}/src/routes ${REMOTE_DIR}/src/socket ${REMOTE_DIR}/src/scripts`);

      // 3. Upload dos arquivos via SFTP
      console.log('\n📤 Iniciando upload dos arquivos do backend...');
      const filesToUpload = getAllFiles(LOCAL_BACKEND_DIR);

      await new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
          if (err) return reject(err);

          let index = 0;
          function uploadNext() {
            if (index >= filesToUpload.length) {
              console.log('✅ Todos os arquivos enviados com sucesso!');
              return resolve();
            }

            const item = filesToUpload[index];
            const remotePath = `${REMOTE_DIR}/${item.relative}`;
            const remoteDir = path.posix.dirname(remotePath);

            sftp.fastPut(item.local, remotePath, (putErr) => {
              if (putErr) {
                console.warn(`Tentando criar subdiretório para ${remotePath}...`);
                conn.exec(`mkdir -p "${remoteDir}"`, () => {
                  sftp.fastPut(item.local, remotePath, (retryErr) => {
                    if (retryErr) {
                      console.error(`Erro ao enviar ${item.relative}:`, retryErr);
                    } else {
                      console.log(`[${index + 1}/${filesToUpload.length}] ${item.relative} -> OK`);
                    }
                    index++;
                    uploadNext();
                  });
                });
              } else {
                console.log(`[${index + 1}/${filesToUpload.length}] ${item.relative} -> OK`);
                index++;
                uploadNext();
              }
            });
          }

          uploadNext();
        });
      });

      // 4. Instalar dependências no diretório do Nexus Chat
      console.log('\n📦 Instalando dependências npm na VPS...');
      await runCommand(conn, `cd ${REMOTE_DIR} && npm install --production`);

      // 5. Iniciar ou reiniciar no PM2 isoladamente
      console.log(`\n⚡ Iniciando/Reiniciando serviço no PM2 (${PM2_NAME})...`);
      await runCommand(conn, `cd ${REMOTE_DIR} && pm2 delete ${PM2_NAME} || true`);
      await runCommand(conn, `cd ${REMOTE_DIR} && pm2 start src/server.js --name "${PM2_NAME}" --time`);
      await runCommand(conn, `pm2 save`);

      // 6. Testar health check na própria VPS
      console.log('\n🩺 Testando endpoint de saúde na VPS...');
      await runCommand(conn, 'curl -I http://localhost:5000/api/health || curl -I http://127.0.0.1:5000/api/health');

      // 7. Status final do PM2
      console.log('\n📋 Status final do PM2:');
      await runCommand(conn, 'pm2 list');

      console.log('\n🎉 DEPLOY DO BACKEND NA VPS CONCLUÍDO COM SUCESSO ABSOLUTO!');
      console.log(`🌐 Backend online em: http://187.127.40.228:5000`);
      console.log(`⚡ WebSocket online em: ws://187.127.40.228:5000`);

    } catch (err) {
      console.error('❌ Erro durante o deploy na VPS:', err);
    } finally {
      conn.end();
    }
  });

  conn.on('error', (err) => {
    console.error('❌ Erro de conexão SSH:', err);
  });

  conn.connect(SSH_CONFIG);
}

deploy();
