const Guild     = require('../collections/guild')
const color     = require('../utils/colors')
const asdate    = require('add-subtract-date')
const msToTime  = require('pretty-ms')

const cache = []

const fetchOrCreate = async (ctx, user, discord_guild) => {
	if(!discord_guild)
		return null

    let fromcache = true
    let guild = cache.filter(x => x.id === discord_guild.id)[0]

    if(!guild) {
        guild = await Guild.findOne({ id: discord_guild.id })
        fromcache = false
    }

    if (!guild) {
        guild = await new Guild()
        guild.id = discord_guild.id
        guild.botchannels = [ctx.msg.channel.id]
        guild.reportchannel = ctx.msg.channel.id
        guild.nextcheck = asdate.add(new Date(), 20, 'hours')

        await guild.save()
        await ctx.reply(user, `new guild added. This channel was marked as bot and report channel.
            Type \`->help guild -here\` to see more about guild setup`)
    }

    if(!fromcache)
        cache.push(guild)

    return guild
}

const addGuildXP = (ctx, user, xp) => {
    let guildUser = ctx.guild.userstats.filter(x => x.id === user.discord_id)[0]
    
    if(!guildUser) {
        guildUser = { id: user.discord_id, xp: 0, rank: 0 }
        ctx.guild.userstats.push(guildUser)

        if(user.xp > 10) {
            const warning = `\nPlease be aware that your claims are **${Math.round(ctx.guild.tax * 100)}%** more expensive here`
            ctx.reply(user, `welcome to **${ctx.discord_guild.name}!** ${ctx.guild.tax > 0? warning : ''}
                For more information run \`->guild info\``)
        }
    }

    ctx.guild.xp += xp * .02
    guildUser.xp += xp
    const rank = XPtoRANK(guildUser.xp)

    if(rank > guildUser.rank)
        ctx.reply(user, `you ranked up in **${ctx.discord_guild.name}!**
            Your rank is now **${rank}**`)

    guildUser.rank = rank
}

const bill_guilds = async (ctx, now) => {
    const guild = await Guild.findOne({nextcheck: {$lt: now}, buildings: {$exists: true, $ne: []}})
    if(!guild) return;

    const report = []
    const isolatedCtx = Object.assign({}, ctx, { guild })
    const cost = getMaintenanceCost(isolatedCtx)
    const ratio = guild.balance / cost
    guild.balance = Math.max(0, guild.balance - cost)

    report.push(`Maintenance cost: **${cost}** ${ctx.symbols.tomato}`)
    report.push(`Remaining guild balance: **${guild.balance}** ${ctx.symbols.tomato}`)

    if(ratio < 1) {
        const damage = Math.round(10 * (1 - ratio))
        guild.buildings.map(x => x.health -= damage)
        guild.lockactive = false
        report.push(`> Negative ratio resulted all buildings taking **${damage}** points of damage. The building will stop functioning if health goes lower than 50%`)
        if(guild.lock)
            report.push(`> Lock has been disabled until next check`)
        
    } else {
        guild.buildings.map(x => x.health = Math.min(x.health + (x.health < 50? 10 : 5), 100))
        report.push(`> All costs were covered! Positive ratio healed buildings by **5%**`)
        if(guild.lock && !guild.lockactive) {
           report.push(`> Guild lock is back!`)
        }
        guild.lockactive = true
    }

    guild.nextcheck = asdate.add(new Date(), 12, 'hours')
    report.push(`Next check is in **${msToTime(guild.nextcheck - now, {compact: true})}**`)
    await guild.save()

    return ctx.send(guild.reportchannel, {
        author: { name: `Receipt for ${now}` },
        description: report.join('\n'),
        color: (ratio < 1? color.red : color.green)
    })
}

const getMaintenanceCost = (ctx) => { 
    let reduce = 1
    const castle = ctx.guild.buildings.filter(x => x.id === 'castle')[0]
    if(castle)
        reduce = (castle.level < 3? 1 : (castle.level < 5? .9 : .7))

    const buildings = ctx.guild.buildings.map(x => ctx.items.filter(y => y.id === x.id)[0].levels[x.level - 1].maintenance).reduce((a, b) => a + b, 0)
    const lockprice = ctx.guild.lock? guildLock.maintenance : 0
    return Math.round((buildings + lockprice) * reduce)
}

const getBuilding = (ctx, id) => ctx.guild.buildings.filter(x => x.id === id && x.health > 50)[0]

const getGuildUser = (ctx, user) => ctx.guild.userstats.filter(x => x.id === user.discord_id)[0]

const isUserOwner = (ctx, user) => ctx.msg.channel.guild.ownerID === user.discord_id

const rankXP = [10, 100, 500, 2500, 10000]

const XPtoRANK = (xp) => rankXP.filter(x => xp > x).length

const guildLock = {
    price: 100000,
    maintenance: 3500
}

module.exports = {
	fetchOrCreate,
    addGuildXP,
    XPtoRANK,
    rankXP,
    getGuildUser,
    isUserOwner,
    getMaintenanceCost,
    bill_guilds,
    getBuilding,
    guildLock
}
