// models/project.model.js
const mongoose = require('mongoose');
const { Schema, Types } = mongoose;



const ProjectSchema = new Schema({
  topic: {
    type: String,
    required: true,
    trim: true,
    maxlength: 250,
  },
  code: {
    type: String,
    required: true,
    trim: true,
    uppercase: true,
    maxlength: 50,
  },
  created_by: {
    type: Types.ObjectId,
    ref: 'User',
    required: true, // Người tạo project bắt buộc
  },
  start_date: { type: Date },
  end_date: { type: Date },
  description: { type: String, trim: true, maxlength: 2000 },
  semester: {
    type: String,
    required: true,
    trim: true,
    // Format: "Fall2025", "Spring2025", "Summer2025" (case insensitive)
    validate: {
      validator: function (v) {
        if (!v) return false;
        // Case insensitive check: fall2025, FALL2025, Fall2025 all accepted
        return /^(fall|spring|summer)\d{4}$/i.test(v);
      },
      message: 'Semester phải có định dạng Fall2025, Spring2025, hoặc Summer2025 (không phân biệt chữ hoa/thường)'
    }
  },
  
  supervisor_id: [{
    type: Types.ObjectId,
    ref: 'User',
  }],
}, {
  timestamps: { createdAt: 'createAt', updatedAt: 'updateAt' },
});

// Indexes để tối ưu query
// 1. Unique index cho code - đảm bảo mã dự án không trùng lặp
ProjectSchema.index({ code: 1 }, { unique: true });

// 2. Index cho status - tìm project theo trạng thái
ProjectSchema.index({ status: 1 });

// 3. Index cho created_by + semester - tối ưu query kiểm tra user đã tạo project trong semester (QUAN TRỌNG)
ProjectSchema.index({ created_by: 1, semester: 1 });

// 4. Index cho semester - tìm projects theo semester
ProjectSchema.index({ semester: 1 });

// 5. Compound index: semester + status - tìm projects theo semester và status
ProjectSchema.index({ semester: 1, status: 1 });

// Virtuals / helpers (ví dụ: duration in days)
ProjectSchema.virtual('durationDays').get(function () {
  if (!this.start_date || !this.end_date) return null;
  const ms = this.end_date - this.start_date;
  return Math.round(ms / (1000 * 60 * 60 * 24));
});

// Pre-save hook example: ensure end_date >= start_date
ProjectSchema.pre('save', function (next) {
  if (this.start_date && this.end_date && this.end_date < this.start_date) {
    return next(new Error('end_date phải lớn hơn hoặc bằng start_date'));
  }
  next();
});

const Project = mongoose.model('Project', ProjectSchema);
module.exports = Project;
