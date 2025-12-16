const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    milestone_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Milestone', required: false },
    feature_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Feature', required: false },
    function_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Function', required: false },
    task_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: false },
    action: { type: String, required: true },
    metadata: { type: Object },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    collection: 'activity_logs',
  }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
