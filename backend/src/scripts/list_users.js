const { supabase } = require('../config/supabase');

async function listUsers() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Erro ao listar usuários:', error);
    return;
  }
  console.log('Usuários existentes:');
  users.forEach(u => {
    console.log(`- ID: ${u.id} | Email: ${u.email} | Metadata:`, u.user_metadata);
  });
}

listUsers();
