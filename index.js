const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits, REST, Routes } = require('discord.js');
const axios = require('axios');
const QRCode = require('qrcode');
const http = require('http');

http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot en ligne ✅');
}).listen(process.env.PORT || 3000);

const REQUIRED_SERVER_ID = '1494387733659910295';
const REQUIRED_SERVER_INVITE = 'https://discord.gg/SEwT2h9eWK';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildBans,
    GatewayIntentBits.DirectMessages,
  ],
  partials: ['CHANNEL'],
});

async function checkServerMembership(interaction) {
  try {
    const guild = await client.guilds.fetch(REQUIRED_SERVER_ID).catch(() => null);
    if (!guild) return true;
    try {
      await guild.members.fetch(interaction.user.id);
      return true;
    } catch {
      const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Accès refusé')
        .setDescription(`Pour utiliser les commandes de ce bot, tu dois rejoindre notre serveur !\n\n🔗 **[Rejoindre le serveur](${REQUIRED_SERVER_INVITE})**`)
        .setFooter({ text: 'Rejoint le serveur puis réessaie.' });
      await interaction.reply({ embeds: [embed], flags: 64 });
      return false;
    }
  } catch {
    return true;
  }
}

client.on('disconnect', () => console.log('⚠️ Bot déconnecté, tentative de reconnexion...'));
client.on('error', (error) => console.error('❌ Erreur Discord:', error.message));
client.on('warn', (info) => console.warn('⚠️ Avertissement:', info));

process.on('uncaughtException', (error) => console.error('❌ Erreur non gérée:', error.message));
process.on('unhandledRejection', (reason) => console.error('❌ Promesse rejetée:', reason));

client.once('ready', async () => {
  console.log(`✅ Bot connecté : ${client.user.tag}`);
  console.log(`📡 ${client.guilds.cache.size} serveur(s) | ${client.users.cache.size} utilisateur(s)`);
  console.log('📋 Serveurs du bot :');
  client.guilds.cache.forEach(g => console.log(`   - ${g.name} (ID: ${g.id})`));
  try {
    const guild = await client.guilds.fetch(REQUIRED_SERVER_ID);
    console.log(`🔒 Serveur requis détecté : ${guild.name}`);
  } catch {
    console.log(`⚠️  Serveur requis (${REQUIRED_SERVER_ID}) introuvable.`);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName !== 'inviter') {
    const allowed = await checkServerMembership(interaction);
    if (!allowed) return;
  }

  try {
    if (commandName === 'help') {
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Liste des commandes')
        .setTimestamp()
        .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
        .addFields(
          { name: '🤖 IA & Outils', value: '`/ai` `/traduit` `/meteo` `/ip` `/num` `/qr`' },
          { name: '👤 Utilisateurs', value: '`/avatar` `/userinfo` `/compte` `/lookup`' },
          { name: '🛡️ Modération', value: '`/ban` `/unban` `/banall` `/unbanall` `/kick` `/mute` `/unmute`' },
          { name: '💬 Salons', value: '`/clear` `/clearsalon` `/lock` `/unlock` `/slowmode` `/embed`' },
          { name: '⚙️ Rôles & Serveur', value: '`/clearrole` `/info`' },
          { name: '🎉 Fun', value: '`/spam` `/raid` `/rappel`' },
          { name: '🔗 Bot', value: '`/inviter` `/help`' },
        );
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'ai') {
      await interaction.deferReply();
      const question = interaction.options.getString('question');
      try {
        const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com/v1';
        const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
        const res = await axios.post(`${baseUrl}/chat/completions`, {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: question }],
          max_tokens: 800,
        }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } });
        const rep = res.data.choices[0].message.content;
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🤖 Réponse IA')
          .addFields({ name: '❓ Question', value: question.slice(0, 1000) }, { name: '💬 Réponse', value: rep.slice(0, 1000) })
          .setFooter({ text: `Demandé par ${interaction.user.tag}` });
        await interaction.editReply({ embeds: [embed] });
      } catch (e) {
        await interaction.editReply('❌ Erreur lors de la requête IA.');
      }
    }

    else if (commandName === 'avatar') {
      const member = interaction.options.getMember('membre') || interaction.member;
      const user = member ? member.user : interaction.user;
      const url = user.displayAvatarURL({ size: 1024, extension: 'png' });
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`Avatar de ${user.tag}`)
        .setImage(url)
        .addFields({ name: '🔗 Lien direct', value: `[Ouvrir](${url})` });
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'ban') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const membre = interaction.options.getMember('membre');
      const raison = interaction.options.getString('raison') || 'Aucune raison';
      await membre.ban({ reason: raison });
      const embed = new EmbedBuilder().setColor(0xFF0000).setTitle('🔨 Membre banni').addFields({ name: 'Membre', value: membre.user.tag }, { name: 'Raison', value: raison });
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'banall') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      await interaction.deferReply();
      const members = await interaction.guild.members.fetch();
      let count = 0;
      for (const [, m] of members) {
        if (m.user.id === client.user.id) continue;
        if (m.permissions.has(PermissionFlagsBits.Administrator)) continue;
        try { await m.ban({ reason: 'banall' }); count++; } catch {}
      }
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setTitle('🔨 BanAll').setDescription(`${count} membre(s) bannis.`)] });
    }

    else if (commandName === 'clear') {
      const nb = Math.min(interaction.options.getInteger('nombre'), 100);
      if (!interaction.guild) {
        await interaction.deferReply({ ephemeral: true });
        const msgs = await interaction.channel.messages.fetch({ limit: nb });
        const botMsgs = msgs.filter(m => m.author.id === client.user.id);
        let count = 0;
        for (const [, m] of botMsgs) {
          try { await m.delete(); count++; } catch {}
          await new Promise(r => setTimeout(r, 300));
        }
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setDescription(`🗑️ ${count} message(s) du bot supprimé(s).`)] });
      } else {
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
        const deleted = await interaction.channel.bulkDelete(nb, true);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setDescription(`🗑️ ${deleted.size} message(s) supprimé(s).`)], ephemeral: true });
      }
    }

    else if (commandName === 'clearrole') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      await interaction.deferReply();
      const role = interaction.options.getRole('role');
      const members = await interaction.guild.members.fetch();
      let count = 0;
      for (const [, m] of members) {
        if (m.roles.cache.has(role.id)) { try { await m.roles.remove(role); count++; } catch {} }
      }
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setDescription(`✅ Rôle **${role.name}** retiré à ${count} membre(s).`)] });
    }

    else if (commandName === 'clearsalon') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const channel = interaction.options.getChannel('salon') || interaction.channel;
      const pos = channel.position;
      const clone = await channel.clone();
      await clone.setPosition(pos);
      await channel.delete();
      await clone.send({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription('✅ Salon vidé avec succès !')] });
      if (channel.id !== interaction.channel.id) await interaction.reply({ content: '✅ Salon vidé !', ephemeral: true });
    }

    else if (commandName === 'compte') {
      await interaction.deferReply();
      const id = interaction.options.getString('id');
      try {
        const user = await client.users.fetch(id, { force: true });
        const createdAt = `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`;
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`👤 Compte Discord`)
          .setThumbnail(user.displayAvatarURL({ size: 512 }))
          .addFields(
            { name: 'Tag', value: user.tag, inline: true },
            { name: 'ID', value: user.id, inline: true },
            { name: 'Bot ?', value: user.bot ? 'Oui' : 'Non', inline: true },
            { name: 'Créé le', value: createdAt },
          );
        await interaction.editReply({ embeds: [embed] });
      } catch {
        await interaction.editReply('❌ Utilisateur introuvable.');
      }
    }

    else if (commandName === 'embed') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      const titre = interaction.options.getString('titre');
      const desc = interaction.options.getString('description');
      const hex = interaction.options.getString('couleur') || '5865F2';
      const color = parseInt(hex.replace('#', ''), 16);
      const embed = new EmbedBuilder().setColor(isNaN(color) ? 0x5865F2 : color).setTitle(titre).setDescription(desc);
      await interaction.channel.send({ embeds: [embed] });
      await interaction.reply({ content: '✅ Embed envoyé !', ephemeral: true });
    }

    else if (commandName === 'info') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      const g = interaction.guild;
      const owner = await g.fetchOwner();
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`📊 ${g.name}`)
        .setThumbnail(g.iconURL({ size: 512 }))
        .addFields(
          { name: 'Propriétaire', value: owner.user.tag, inline: true },
          { name: 'ID', value: g.id, inline: true },
          { name: 'Membres', value: `${g.memberCount}`, inline: true },
          { name: 'Salons', value: `${g.channels.cache.size}`, inline: true },
          { name: 'Rôles', value: `${g.roles.cache.size}`, inline: true },
          { name: 'Créé le', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:F>` },
        );
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'inviter') {
      const clientId = process.env.DISCORD_CLIENT_ID;
      const profileInvite = `https://discord.com/oauth2/authorize?client_id=${clientId}&integration_type=1&scope=applications.commands`;
      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('🤖 Inviter le bot')
        .setDescription('Clique ci-dessous pour ajouter le bot à ton profil Discord et utiliser les commandes en DM ou dans n\'importe quel serveur !')
        .addFields({ name: '👤 Ajouter à ton profil Discord', value: `[Clique ici](${profileInvite})` })
        .setFooter({ text: 'Rejoins aussi notre serveur : discord.gg/SEwT2h9eWK' });
      await interaction.reply({ embeds: [embed] });
    }

    else if (commandName === 'ip') {
      await interaction.deferReply();
      const ip = interaction.options.getString('adresse');
      try {
        const res = await axios.get(`http://ip-api.com/json/${ip}?lang=fr`);
        const d = res.data;
        if (d.status === 'fail') return interaction.editReply('❌ IP invalide ou privée.');
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`🌐 Infos IP : ${ip}`)
          .addFields(
            { name: 'Pays', value: `${d.country} (${d.countryCode})`, inline: true },
            { name: 'Région', value: d.regionName || 'N/A', inline: true },
            { name: 'Ville', value: d.city || 'N/A', inline: true },
            { name: 'FAI', value: d.isp || 'N/A', inline: true },
            { name: 'Organisation', value: d.org || 'N/A', inline: true },
            { name: 'Fuseau', value: d.timezone || 'N/A', inline: true },
            { name: 'Lat/Lon', value: `${d.lat}, ${d.lon}`, inline: true },
          );
        await interaction.editReply({ embeds: [embed] });
      } catch {
        await interaction.editReply('❌ Erreur lors de la requête IP.');
      }
    }

    else if (commandName === 'kick') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const membre = interaction.options.getMember('membre');
      const raison = interaction.options.getString('raison') || 'Aucune raison';
      await membre.kick(raison);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF8C00).setTitle('👢 Membre expulsé').addFields({ name: 'Membre', value: membre.user.tag }, { name: 'Raison', value: raison })] });
    }

    else if (commandName === 'lock') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const channel = interaction.options.getChannel('salon') || interaction.channel;
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFF0000).setDescription(`🔒 Salon **${channel.name}** verrouillé.`)] });
    }

    else if (commandName === 'lookup') {
      await interaction.deferReply();
      const nom = interaction.options.getString('nom');
      const members = interaction.guild
        ? interaction.guild.members.cache.filter(m => m.user.username.toLowerCase().includes(nom.toLowerCase()))
        : null;
      if (!members || members.size === 0) return interaction.editReply(`❌ Aucun membre trouvé avec le nom **${nom}**.`);
      const list = members.first(10).map(m => `• ${m.user.tag} (${m.user.id})`).join('\n');
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x5865F2).setTitle(`🔍 Résultats pour "${nom}"`).setDescription(list)] });
    }

    else if (commandName === 'meteo') {
      await interaction.deferReply();
      const ville = interaction.options.getString('ville');
      try {
        const res = await axios.get(`https://wttr.in/${encodeURIComponent(ville)}?format=j1`);
        const d = res.data;
        const current = d.current_condition[0];
        const desc = current.lang_fr ? current.lang_fr[0].value : current.weatherDesc[0].value;
        const embed = new EmbedBuilder()
          .setColor(0x87CEEB)
          .setTitle(`🌤️ Météo à ${ville}`)
          .addFields(
            { name: 'Température', value: `${current.temp_C}°C (ressenti ${current.FeelsLikeC}°C)`, inline: true },
            { name: 'Humidité', value: `${current.humidity}%`, inline: true },
            { name: 'Vent', value: `${current.windspeedKmph} km/h`, inline: true },
            { name: 'Condition', value: desc, inline: true },
            { name: 'Visibilité', value: `${current.visibility} km`, inline: true },
          );
        await interaction.editReply({ embeds: [embed] });
      } catch {
        await interaction.editReply('❌ Impossible de récupérer la météo pour cette ville.');
      }
    }

    else if (commandName === 'mute') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const membre = interaction.options.getMember('membre');
      const duree = interaction.options.getInteger('duree') || 10;
      const ms = duree * 60 * 1000;
      await membre.timeout(ms, 'Mute via commande');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setTitle('🔇 Membre muet').addFields({ name: 'Membre', value: membre.user.tag }, { name: 'Durée', value: `${duree} minute(s)` })] });
    }

    else if (commandName === 'num') {
      await interaction.deferReply();
      const numero = interaction.options.getString('numero');
      try {
        const res = await axios.get(`https://phonevalidation.abstractapi.com/v1/?api_key=demo&phone=${encodeURIComponent(numero)}`);
        const d = res.data;
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`📞 Numéro : ${numero}`)
          .addFields(
            { name: 'Valide', value: d.valid ? 'Oui' : 'Non', inline: true },
            { name: 'Pays', value: d.country?.name || 'N/A', inline: true },
            { name: 'Format local', value: d.local_format || 'N/A', inline: true },
            { name: 'Format international', value: d.international_format || 'N/A', inline: true },
            { name: 'Opérateur', value: d.carrier || 'N/A', inline: true },
            { name: 'Type', value: d.line_type || 'N/A', inline: true },
          );
        await interaction.editReply({ embeds: [embed] });
      } catch {
        await interaction.editReply('❌ Impossible de vérifier ce numéro.');
      }
    }

    else if (commandName === 'qr') {
      await interaction.deferReply();
      const texte = interaction.options.getString('texte');
      try {
        const buffer = await QRCode.toBuffer(texte, { width: 300 });
        const attachment = new AttachmentBuilder(buffer, { name: 'qrcode.png' });
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('📱 QR Code généré')
          .setDescription(`Texte : \`${texte.slice(0, 100)}\``)
          .setImage('attachment://qrcode.png');
        await interaction.editReply({ embeds: [embed], files: [attachment] });
      } catch {
        await interaction.editReply('❌ Impossible de générer le QR code.');
      }
    }

    else if (commandName === 'raid') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const message = interaction.options.getString('message');
      const nb = Math.min(interaction.options.getInteger('nombre') || 5, 10);
      await interaction.reply({ content: '🚨 Raid lancé !', ephemeral: true });
      for (let i = 0; i < nb; i++) {
        await interaction.channel.send(`@everyone ${message}`);
        await new Promise(r => setTimeout(r, 500));
      }
    }

    else if (commandName === 'rappel') {
      const minutes = interaction.options.getInteger('minutes');
      const msg = interaction.options.getString('message');
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`⏰ Je te rappellerai dans **${minutes} minute(s)** : *${msg}*`)] });
      setTimeout(async () => {
        try {
          const embed = new EmbedBuilder().setColor(0xFFD700).setTitle('⏰ Rappel !').setDescription(msg).setFooter({ text: `Rappel demandé par ${interaction.user.tag}` });
          await interaction.user.send({ embeds: [embed] });
        } catch {}
      }, minutes * 60 * 1000);
    }

    else if (commandName === 'slowmode') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const secs = interaction.options.getInteger('secondes');
      const channel = interaction.options.getChannel('salon') || interaction.channel;
      await channel.setRateLimitPerUser(secs);
      const msg = secs === 0 ? `⚡ Mode lent désactivé dans **${channel.name}**` : `🐢 Mode lent : **${secs}s** dans **${channel.name}**`;
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xFFA500).setDescription(msg)] });
    }

    else if (commandName === 'spam') {
      if (interaction.guildId === '1494387733659910295') {
        return interaction.reply({ content: 'Non fiston, pas ici. Va spam ailleurs 💀', flags: 64 });
      }
      const message = interaction.options.getString('message');
      const nb = Math.min(interaction.options.getInteger('nombre') || 5, 10);
      await interaction.reply({ content: `📨 **"${message}"** envoyé ${nb} fois.`, flags: 64 });
      for (let i = 0; i < nb; i++) {
        if (interaction.channel && typeof interaction.channel.send === 'function') {
          await interaction.channel.send(message);
        } else {
          await interaction.followUp({ content: message });
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }

    else if (commandName === 'traduit') {
      await interaction.deferReply();
      const texte = interaction.options.getString('texte');
      const langue = interaction.options.getString('langue') || 'fr';
      try {
        const res = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texte)}&langpair=auto|${langue}`);
        const trad = res.data.responseData.translatedText;
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🌍 Traduction')
          .addFields({ name: '📝 Original', value: texte.slice(0, 1000) }, { name: `✅ Traduit (${langue})`, value: trad.slice(0, 1000) });
        await interaction.editReply({ embeds: [embed] });
      } catch {
        await interaction.editReply('❌ Impossible de traduire ce texte.');
      }
    }

    else if (commandName === 'unban') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const id = interaction.options.getString('id');
      try {
        await interaction.guild.members.unban(id);
        await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`✅ Utilisateur \`${id}\` débanni.`)] });
      } catch {
        await interaction.reply('❌ Impossible de débannir cet utilisateur.');
      }
    }

    else if (commandName === 'unbanall') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.BanMembers)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      await interaction.deferReply();
      const bans = await interaction.guild.bans.fetch();
      let count = 0;
      for (const [, ban] of bans) { try { await interaction.guild.members.unban(ban.user.id); count++; } catch {} }
      await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`✅ ${count} utilisateur(s) débanni(s).`)] });
    }

    else if (commandName === 'unlock') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const channel = interaction.options.getChannel('salon') || interaction.channel;
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setDescription(`🔓 Salon **${channel.name}** déverrouillé.`)] });
    }

    else if (commandName === 'unmute') {
      if (!interaction.guild) return interaction.reply({ content: '❌ Refusé — cette commande est réservée aux serveurs.', ephemeral: true });
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply({ content: '❌ Accès refusé.', ephemeral: true });
      const membre = interaction.options.getMember('membre');
      await membre.timeout(null);
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x00FF00).setTitle('🔊 Membre démute').addFields({ name: 'Membre', value: membre.user.tag })] });
    }

    else if (commandName === 'userinfo') {
      await interaction.deferReply();
      if (!interaction.guild) {
        const user = interaction.options.getUser('membre') || interaction.user;
        const fetched = await client.users.fetch(user.id, { force: true });
        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle(`👤 ${fetched.tag}`)
          .setThumbnail(fetched.displayAvatarURL({ size: 512 }))
          .addFields(
            { name: 'ID', value: fetched.id, inline: true },
            { name: 'Bot ?', value: fetched.bot ? 'Oui' : 'Non', inline: true },
            { name: 'Compte créé le', value: `<t:${Math.floor(fetched.createdTimestamp / 1000)}:F>` },
          );
        return interaction.editReply({ embeds: [embed] });
      }
      const membre = interaction.options.getMember('membre') || interaction.member;
      const user = membre.user;
      const roles = membre.roles.cache.filter(r => r.id !== interaction.guild.id).map(r => r.toString()).slice(0, 10).join(', ') || 'Aucun';
      const embed = new EmbedBuilder()
        .setColor(membre.displayHexColor || 0x5865F2)
        .setTitle(`👤 ${user.tag}`)
        .setThumbnail(user.displayAvatarURL({ size: 512 }))
        .addFields(
          { name: 'ID', value: user.id, inline: true },
          { name: 'Pseudo serveur', value: membre.displayName, inline: true },
          { name: 'Bot ?', value: user.bot ? 'Oui' : 'Non', inline: true },
          { name: 'Compte créé', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` },
          { name: 'A rejoint le', value: `<t:${Math.floor(membre.joinedTimestamp / 1000)}:F>` },
          { name: 'Rôles', value: roles },
        );
      await interaction.editReply({ embeds: [embed] });
    }

  } catch (err) {
    console.error(`Erreur commande ${commandName}:`, err);
    const errMsg = '❌ Une erreur est survenue.';
    if (interaction.deferred) await interaction.editReply(errMsg).catch(() => {});
    else await interaction.reply({ content: errMsg, ephemeral: true }).catch(() => {});
  }
});

client.login(process.env.DISCORD_TOKEN);
