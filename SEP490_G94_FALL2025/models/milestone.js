const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project",
    required: true
  },
  description: {
    type: String,
    default: ""
  },
  start_date: {
    type: Date
  },
  deadline: {
    type: Date
  },
  status: {
    type: String,
    enum: ["To Do", "Doing", "Done",],
    default: "To Do",
    required: true,
  },
  tags: [
    {
      type: String,
      trim: true
    }
  ],
  code: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  }
}, {
  timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
  collection: "milestones"
});

module.exports = mongoose.model("Milestone", milestoneSchema);
