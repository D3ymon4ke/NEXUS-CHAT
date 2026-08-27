const { supabase } = require('../config/supabase');

async function testFriends() {
  const { data: friendships, error } = await supabase
    .from('friendships')
    .select('*, user:profiles!friendships_user_id_fkey(username), friend:profiles!friendships_friend_id_fkey(username)')
    .eq('status', 'accepted');

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`✅ Total de amizades aceitas no Supabase: ${friendships.length}`);
  friendships.slice(0, 10).forEach(f => {
    console.log(`- ${f.user?.username} <---> ${f.friend?.username} (status: ${f.status})`);
  });
}

testFriends();
