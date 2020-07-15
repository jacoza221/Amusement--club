const {model, Schema} = require('mongoose')

module.exports = model('AuditAucSell', {
    audit_id:       { type: String },
    user:           { type: String },
    name:           { type: String },

    audited:        { type: Boolean, default: false },

    sold:           { type: Number, default: 0 },
    unsold:         { type: Number, default: 0 },

    time:           { type: Date },

    closedBy:       { type: String },

})
