const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actorId: { type: Number, required: true },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String },
  occurredAt: { type: Date, default: Date.now }
}, { versionKey: false });

auditLogSchema.index({ actorId: 1, occurredAt: -1 });

module.exports = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
