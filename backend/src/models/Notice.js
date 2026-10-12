const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 10000 },
  audience: { type: String, enum: ['all', 'students', 'parents', 'staff', 'class'], default: 'all' },
  className: { type: String, trim: true },
  authorId: { type: Number, required: true },
  authorName: { type: String, required: true },
  publishedAt: { type: Date, default: Date.now }
}, { timestamps: true });

noticeSchema.index({ publishedAt: -1 });

module.exports = mongoose.models.Notice || mongoose.model('Notice', noticeSchema);
