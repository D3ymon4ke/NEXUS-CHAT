const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const testLogins = [
  { email: 'belmontnexus@nexus.com', password: '08059900p' },
  { email: 'sara@nexus.com', password: '08059900p' },
  { email: 'zoe@nexus.com', password: '08059900p' },
  { email: 'pricila@nexus.com', password: '08059900p' },
  { email: 'hana@nexus.com', password: '08059900p' },
  { email: 'vitoria@nexus.com', password: '08059900p' },
  { email: 'lavignia@nexus.com', password: '08059900p' },
];

async function verifyLogins() {
  console.log('🧪 Verificando autenticação de todas as contas criadas...');
  for (const item of testLogins) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: item.email,
      password: item.password
    });

    if (error) {
      console.error(`❌ Falha no login para ${item.email}:`, error.message);
    } else {
      console.log(`✅ Login bem-sucedido para ${item.email} (Usuário: ${data.user.user_metadata?.display_name || data.user.email})`);
    }
  }
}

verifyLogins();
