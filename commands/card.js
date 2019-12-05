const {claimCost}           = require('../utils/tools')
const {cmd}                 = require('../utils/cmd')
const {addConfirmation}     = require('../utils/confirmator')
const sample                = require('lodash.sample');

const {
    formatName,
    formatLink,
    equals,
    addUserCard,
    withCards,
    bestMatch
} = require('../modules/card')

cmd('claim', 'cl', async (ctx, user, arg1) => {
    const cards = []
    const amount = parseInt(arg1) || 1
    const price = claimCost(user, amount)

    if(price > user.exp)
        return ctx.reply(user, `you need **${price}** {curency} to claim ${amount > 1? amount + ' cards' : 'a card'}.\n 
            You have ${Math.floor(user.exp)}`)

    for (let i = 0; i < amount; i++) {
        const col = sample(ctx.collections)
        const item = sample(ctx.cards.filter(x => x.col === col.id && x.level < 5))
        addUserCard(user, ctx.cards.findIndex(x => equals(x, item)))
        cards.push(item)
    }

    user.exp -= price
    user.dailystats.claims = user.dailystats.claims + amount || amount

    await user.save()

    cards.sort((a, b) => b.level - a.level)

    return ctx.reply(user, {
        url: formatLink(cards[0]),
        description: `you got:\n ${cards.map(x => formatName(x)).join('\n')}\n\nYour next claim will cost **${claimCost(user, user.dailystats.claims)}** {currency}`
    })
})

cmd('sum', 'summon', withCards(async (ctx, user, cards, parsedargs) => {
    const card = bestMatch(cards)
    return ctx.reply(user, {
        url: formatLink(card),
        description: `summons **${formatName(card)}**!`
    })
}))

cmd('sell', withCards(async (ctx, user, cards, parsedargs) => {
    const price = 100
    const card = bestMatch(cards)

    //await 

    addConfirmation(ctx, user, 
        `do you want to sell **${formatName(card)}** to bot for **${price}** {currency}?`, [], 
        async () => {
            if(card.amount > 1)
                user.cards.filter(x => x.id === card.id)[0].amount--
            else
                user.cards = user.cards.filter(x => x.id != card.id)

            user.exp += price
            await user.save()
            return ctx.reply(user, `you sold **${formatName(card)}** for **${price}** {currency}`)
        })
}))
