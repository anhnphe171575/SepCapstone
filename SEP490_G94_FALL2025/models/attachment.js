const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: false,
      index: true
    },
    feature_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feature',
      required: false,
      index: true
    },
    function_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Function',
      required: false,
      index: true
    },
    milestone_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone',
      required: false,
      index: true
    },
    file_name: {
      type: String,
      required: true,
      trim: true
    },
    file_url: {
      type: String,
      required: true,
      trim: true
    },
    file_type: {
      type: String,
      default: '',
      trim: true
    },
    file_size: {
      type: Number,
      default: 0 // Size in bytes
    },
    
    // Thông tin upload
    uploaded_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    is_link: {
      type: Boolean,
      default: false // false = uploaded file, true = external link
    },
  },
  {
    timestamps: true,
    collection: 'attachments',
    strictPopulate: false
  }
);

// Index compound để query nhanh hơn
attachmentSchema.index({ project_id: 1, task_id: 1 });
attachmentSchema.index({ project_id: 1, feature_id: 1 });
attachmentSchema.index({ project_id: 1, milestone_id: 1 });
attachmentSchema.index({ uploaded_by: 1, createdAt: -1 });

module.exports = mongoose.model('Attachment', attachmentSchema);

