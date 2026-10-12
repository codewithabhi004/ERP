const mongoose = require('mongoose');

const homeworkSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, trim: true, maxlength: 5000 },
  subject: { type: String, required: true, trim: true },
  className: { type: String, required: true, trim: true },
  dueDate: { type: Date, required: true },
  authorId: { type: Number, required: true },
  authorName: { type: String, required: true }
}, { timestamps: true });

homeworkSchema.index({ className: 1, dueDate: 1 });

module.exports = mongoose.models.Homework || mongoose.model('Homework', homeworkSchema);
