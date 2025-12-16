const mongoose = require('mongoose');

const taskDependencySchema = new mongoose.Schema(
  {
    task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    depends_on_task_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    dependency_type: {
      type: String,
      enum: ['FS', 'FF', 'SS', 'SF', 'relates_to'],
      default: 'FS',
      required: true,
    },
    lag_days: {
      type: Number,
      default: 0,
      // Positive = delay, Negative = lead time
    },
    is_mandatory: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
    }
  },
  {
    timestamps: true,
    collection: 'task_dependencies',
  }
);

// Composite index to prevent duplicate dependencies
taskDependencySchema.index({ task_id: 1, depends_on_task_id: 1, dependency_type: 1 }, { unique: true });

// Index for faster lookups
taskDependencySchema.index({ task_id: 1 });
taskDependencySchema.index({ depends_on_task_id: 1 });

module.exports = mongoose.model('TaskDependency', taskDependencySchema);

