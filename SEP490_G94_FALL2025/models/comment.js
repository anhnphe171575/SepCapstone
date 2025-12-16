const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    milestone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone' },
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    feature_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Feature' },
    function_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Function' },

    // Author
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Content
    content: { type: String, required: true, trim: true },
  },
  {
    // Use standard createdAt/updatedAt for consistent sorting and queries
    timestamps: true,
    collection: 'comments',
  }
);

module.exports = mongoose.model('Comment', commentSchema);
