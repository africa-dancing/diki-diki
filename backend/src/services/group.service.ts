import { supabase } from '../../config/supabase';

// ── Créer un groupe dans une compétition ──────────────────
export async function createGroup(
  contestId:  string,
  leaderId:   string,
  groupName:  string
) {
  // Vérifier le concours
  const { data: contest } = await supabase
    .from('contests')
    .select('*')
    .eq('id', contestId)
    .single();

  if (!contest)                        throw new Error('CONTEST_NOT_FOUND');
  if (contest.comp_type !== 'groupe')  throw new Error('NOT_A_GROUP_CONTEST');
  if (!['open','draft'].includes(contest.status)) throw new Error('CONTEST_NOT_OPEN');

  // Compter les groupes existants
  const { count } = await supabase
    .from('groups')
    .select('*', { count: 'exact', head: true })
    .eq('contest_id', contestId);

  if ((count || 0) >= contest.max_groups) {
    throw new Error('MAX_GROUPS_REACHED');
  }

  // Vérifier que ce user n'est pas déjà dans un groupe
  const { data: existing } = await supabase
    .from('group_members')
    .select('group_id, groups!inner(contest_id)')
    .eq('user_id', leaderId)
    .eq('groups.contest_id', contestId)
    .single();

  if (existing) throw new Error('ALREADY_IN_GROUP');

  // Créer le groupe
  const { data: group, error } = await supabase
    .from('groups')
    .insert({
      contest_id: contestId,
      name:       groupName,
      position:   (count || 0) + 1,
    })
    .select()
    .single();

  if (error) throw error;

  // Ajouter le créateur comme leader
  await supabase.from('group_members').insert({
    group_id:  group.id,
    user_id:   leaderId,
    is_leader: true,
  });

  return group;
}

// ── Rejoindre un groupe existant ──────────────────────────
export async function joinGroup(groupId: string, userId: string) {
  // Récupérer le groupe et sa compétition
  const { data: group } = await supabase
    .from('groups')
    .select('*, contests(*)')
    .eq('id', groupId)
    .single();

  if (!group) throw new Error('GROUP_NOT_FOUND');

  const contest = group.contests;
  if (!['open','draft'].includes(contest.status)) {
    throw new Error('CONTEST_NOT_OPEN');
  }

  // Compter les membres actuels
  const { count: memberCount } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);

  if ((memberCount || 0) >= contest.max_members_per_group) {
    throw new Error('GROUP_FULL');
  }

  // Vérifier déjà membre
  const { data: already } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (already) throw new Error('ALREADY_IN_GROUP');

  // Ajouter le membre
  const { data, error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId, is_leader: false })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Soumettre la vidéo d'un groupe ────────────────────────
export async function submitGroupVideo(
  groupId:  string,
  leaderId: string,
  videoId:  string
) {
  // Vérifier que c'est bien le leader
  const { data: member } = await supabase
    .from('group_members')
    .select('is_leader')
    .eq('group_id', groupId)
    .eq('user_id', leaderId)
    .single();

  if (!member?.is_leader) throw new Error('LEADER_ONLY');

  // Vérifier que la vidéo est approuvée
  const { data: video } = await supabase
    .from('videos')
    .select('status, user_id')
    .eq('id', videoId)
    .single();

  if (!video)                       throw new Error('VIDEO_NOT_FOUND');
  if (video.status !== 'approved')  throw new Error('VIDEO_NOT_APPROVED');
  if (video.user_id !== leaderId)   throw new Error('NOT_YOUR_VIDEO');

  const { data, error } = await supabase
    .from('groups')
    .update({ video_id: videoId })
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ── Classement d'une compétition Groupe ───────────────────
export async function getGroupRanking(contestId: string) {
  const { data: groups, error } = await supabase
    .from('groups')
    .select(`
      id, name, position, video_id,
      group_members ( user_id, is_leader, users(first_name, last_name, avatar_url) ),
      videos ( id, storage_url, thumbnail_url, track_title, track_artist, discipline )
    `)
    .eq('contest_id', contestId);

  if (error) throw error;

  // Votes par groupe
  const { data: votes } = await supabase
    .from('votes')
    .select('group_id')
    .eq('contest_id', contestId);

  const voteCounts: Record<string, number> = {};
  for (const v of votes || []) {
    if (v.group_id) {
      voteCounts[v.group_id] = (voteCounts[v.group_id] || 0) + 1;
    }
  }

  const totalVotes = Object.values(voteCounts).reduce((s, n) => s + n, 0);

  return (groups || [])
    .map(g => ({
      ...g,
      votes:      voteCounts[g.id] || 0,
      percentage: totalVotes > 0
        ? Math.round(((voteCounts[g.id] || 0) / totalVotes) * 100)
        : 0,
      cagnotte:   (voteCounts[g.id] || 0) * 50,
    }))
    .sort((a, b) => b.votes - a.votes);
}

// ── Récupérer les groupes d'un utilisateur ────────────────
export async function getUserGroups(userId: string) {
  const { data, error } = await supabase
    .from('group_members')
    .select(`
      is_leader,
      groups (
        id, name, position,
        contests ( id, title, discipline, status, comp_type )
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}
