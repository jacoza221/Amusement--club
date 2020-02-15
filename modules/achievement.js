const colors    = require('../utils/colors')

const check_achievements = async (ctx, user, action) => {
    const possible = ctx.achievements.filter(x => x.actions.includes(action) && !user.achievements.includes(x.id))
    const complete = possible.filter(x => x.check(ctx, user))[0]

    if(complete) {
        const reward = complete.resolve(ctx, user)
        user.achievements.push(complete.id)
        await user.save()

        return ctx.send(ctx.msg.channel.id, {
            color: colors.blue,
            author: { name: `New Achievement:` },
            title: complete.name,
            description: `(${complete.desc})`,
            thumbnail: { url: `${ctx.baseurl}/achievements/${complete.id}.png` },
            fields: [{
                name: `Reward`,
                value: reward
            }]
        })
    }
}

const check_daily = async (ctx, user, action) => {
    const rewards = []
    const complete = []

    ctx.quests.daily.filter(x => user.dailyquests.some(y => x.id === y && x.check(ctx, user)))
    .map(x => {
        const reward = x.resolve(ctx, user)
        user.dailyquests = user.dailyquests.filter(y => y != x.id)
        rewards.push(x.reward(ctx))
        complete.push(x.name.replace('-star', ctx.symbols.star))
    })

    if(complete.length === 0)
        return

    user.markModified('dailyquests')
    await user.save()

    return ctx.send(ctx.msg.channel.id, {
        color: colors.green,
        author: { name: `${user.username}, you completed:` },
        description: complete.join('\n'),
        fields: [{
            name: `Rewards`,
            value: rewards.join('\n')
        }]
    })
}

const check_all = async (ctx, user, action) => {
    await check_achievements(ctx, user, action)

    if(user.dailyquests.length > 0)
        await check_daily(ctx, user, action)
}

module.exports = {
    check_achievements,
    check_daily,
    check_all
}