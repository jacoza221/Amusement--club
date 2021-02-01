const express       = require("express")
const bodyParser    = require("body-parser")
const Topgg         = require('@top-gg/sdk')
const color         = require('../utils/colors')
const _             = require('lodash')

const {
    formatName,
    addUserCard,
} = require('./card')

const {
    fetchOnly,
} = require('../modules/user')

const listen = (ctx) => {
    const app = express()
    const topggWebhook = new Topgg.Webhook(ctx.dbl.pass)
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({ extended: true })); 

    // Webhook handle for https://top.gg/
    app.post("/topgg", (req, res) => {
        const vote = req.vote
        registerTopggVote(ctx, vote)
        res.status(200).end()
    })

    // Webhook handle for https://discordbotlist.com/
    app.post("/dbl", (req, res) => {
        registerDblVote(ctx, req)
        res.status(200).end()
    })

    // Webhook handle for https://ko-fi.com/
    app.post("/kofi", (req, res) => {
        // TODO: add donation handle
        const obj = JSON.parse(req.body.data)
        console.log(obj)
        res.status(200).end()
    })

    app.listen(ctx.dbl.port, () => console.log(`Listening to webhooks on port ${ctx.dbl.port}`))
}

const registerTopggVote = async (ctx, vote) => {
    //var votingUser = await fetchOnly(vote.user)
    var votingUser = await fetchOnly("135401616214982656")

    if(!votingUser) 
        return

    console.log(`User ${votingUser.username} just voted on top.gg!`)
    votingUser.votes++

    const streak1 = 10 - votingUser.votes % 10
    const streak2 = 100 - votingUser.votes % 100

    let card = _.sample(ctx.cards.filter(y => y.level < 4 
        && !ctx.collections.find(z => z.id === y.col).promo))
    if(votingUser.votes % 100 === 0) {
        card = _.sample(ctx.cards.filter(y => y.col === 'special'))
    } else if(votingUser.votes % 10 === 0) {
        card = _.sample(ctx.cards.filter(y => y.level < 4 && y.col === _.sample(ctx.collections.filter(z => z.promo)).id))
    }

    addUserCard(votingUser, card.id)
    votingUser.lastvote = new Date()
    votingUser.votenotified = false
    votingUser.save()

    return ctx.direct(votingUser, {
        image: { url: card.url },
        color: color.blue,
        description: `thank you for voting! You got **${formatName(card)}**
        Votes until free event card: **${streak1}**
        Votes until free special card: **${streak2}**`
    })
}

const registerDblVote = async (ctx, vote) => {
    // TODO: add streak
    var votingUser = await fetchOnly(vote.user)

    if(!votingUser) 
        return

    console.log(`User ${votingUser.username} just voted on dbl!`)
    votingUser.exp += 500
    votingUser.save()

    return ctx.direct(votingUser, {
        image: { url: card.url },
        color: color.blue,
        description: `thank you for voting! You got **${500}${ctx.symbols.tomato}**
        --streak--`
    })
}

module.exports = {
    listen,
}
