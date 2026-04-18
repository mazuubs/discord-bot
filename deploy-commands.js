const { REST, Routes } = require('discord.js');

const base = {
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const commands = [
  { ...base, name: 'help', description: 'Affiche toutes les commandes disponibles', options: [] },
  { ...base, name: 'ai', description: 'Pose une question à l\'IA', options: [{ name: 'question', description: 'Ta question', type: 3, required: true }] },
  { ...base, name: 'avatar', description: 'Affiche l\'avatar d\'un membre', options: [{ name: 'membre', description: 'Le membre', type: 6, required: false }] },
  { ...base, name: 'ban', description: 'Bannir un membre', options: [
    { name: 'membre', description: 'Le membre à bannir', type: 6, required: true },
    { name: 'raison', description: 'Raison du ban', type: 3, required: false },
  ]},
  { ...base, name: 'banall', description: 'Bannir tous les membres non-admins du serveur', options: [] },
  { ...base, name: 'clear', description: 'Supprimer des messages', options: [{ name: 'nombre', description: 'Nombre de messages (max 100)', type: 4, required: true }] },
  { ...base, name: 'clearrole', description: 'Retirer un rôle à tous les membres', options: [{ name: 'role', description: 'Le rôle à retirer', type: 8, required: true }] },
  { ...base, name: 'clearsalon', description: 'Vider un salon', options: [{ name: 'salon', description: 'Le salon à vider', type: 7, required: false }] },
  { ...base, name: 'compte', description: 'Infos sur un compte Discord par ID', options: [{ name: 'id', description: 'ID Discord', type: 3, required: true }] },
  { ...base, name: 'embed', description: 'Envoyer un embed personnalisé', options: [
    { name: 'titre', description: 'Titre de l\'embed', type: 3, required: true },
    { name: 'description', description: 'Description de l\'embed', type: 3, required: true },
    { name: 'couleur', description: 'Couleur hex (ex: FF0000)', type: 3, required: false },
  ]},
  { ...base, name: 'info', description: 'Infos sur le serveur', options: [] },
  { ...base, name: 'inviter', description: 'Obtenir le lien d\'invitation du bot', options: [] },
  { ...base, name: 'ip', description: 'Infos sur une adresse IP', options: [{ name: 'adresse', description: 'Adresse IP', type: 3, required: true }] },
  { ...base, name: 'kick', description: 'Expulser un membre', options: [
    { name: 'membre', description: 'Le membre à expulser', type: 6, required: true },
    { name: 'raison', description: 'Raison', type: 3, required: false },
  ]},
  { ...base, name: 'lock', description: 'Verrouiller un salon', options: [{ name: 'salon', description: 'Salon à verrouiller', type: 7, required: false }] },
  { ...base, name: 'lookup', description: 'Chercher un membre par son nom', options: [{ name: 'nom', description: 'Nom à rechercher', type: 3, required: true }] },
  { ...base, name: 'meteo', description: 'Météo d\'une ville', options: [{ name: 'ville', description: 'Nom de la ville', type: 3, required: true }] },
  { ...base, name: 'mute', description: 'Rendre muet un membre', options: [
    { name: 'membre', description: 'Le membre', type: 6, required: true },
    { name: 'duree', description: 'Durée en minutes (défaut: 10)', type: 4, required: false },
  ]},
  { ...base, name: 'num', description: 'Vérifier un numéro de téléphone', options: [{ name: 'numero', description: 'Numéro de téléphone', type: 3, required: true }] },
  { ...base, name: 'qr', description: 'Générer un QR code', options: [{ name: 'texte', description: 'Texte ou lien à encoder', type: 3, required: true }] },
  { ...base, name: 'raid', description: 'Envoyer un message plusieurs fois (admin)', options: [
    { name: 'message', description: 'Message à envoyer', type: 3, required: true },
    { name: 'nombre', description: 'Nombre de fois (max 10)', type: 4, required: false },
  ]},
  { ...base, name: 'rappel', description: 'Se rappeler quelque chose dans X minutes', options: [
    { name: 'minutes', description: 'Dans combien de minutes', type: 4, required: true },
    { name: 'message', description: 'Message du rappel', type: 3, required: true },
  ]},
  { ...base, name: 'slowmode', description: 'Activer/désactiver le mode lent', options: [
    { name: 'secondes', description: 'Délai en secondes (0 = désactiver)', type: 4, required: true },
    { name: 'salon', description: 'Salon cible', type: 7, required: false },
  ]},
  { ...base, name: 'spam', description: 'Envoyer un message plusieurs fois', options: [
    { name: 'message', description: 'Message à spammer', type: 3, required: true },
    { name: 'nombre', description: 'Nombre de fois (max 10)', type: 4, required: false },
  ]},
  { ...base, name: 'traduit', description: 'Traduire un texte', options: [
    { name: 'texte', description: 'Texte à traduire', type: 3, required: true },
    { name: 'langue', description: 'Langue cible (ex: en, es, de)', type: 3, required: false },
  ]},
  { ...base, name: 'unban', description: 'Débannir un utilisateur par ID', options: [{ name: 'id', description: 'ID de l\'utilisateur', type: 3, required: true }] },
  { ...base, name: 'unbanall', description: 'Débannir tous les utilisateurs bannis', options: [] },
  { ...base, name: 'unlock', description: 'Déverrouiller un salon', options: [{ name: 'salon', description: 'Salon à déverrouiller', type: 7, required: false }] },
  { ...base, name: 'unmute', description: 'Démuter un membre', options: [{ name: 'membre', description: 'Le membre', type: 6, required: true }] },
  { ...base, name: 'userinfo', description: 'Infos sur un utilisateur', options: [{ name: 'membre', description: 'Le membre', type: 6, required: false }] },
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Enregistrement des commandes slash...');
    await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
    console.log('✅ Commandes enregistrées avec succès !');
  } catch (error) {
    console.error('❌ Erreur :', error);
  }
})();
