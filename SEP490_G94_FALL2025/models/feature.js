const mongoose = require("mongoose");

const featureSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Project"
  },
  priority: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Medium"
  },
  status: {
    type: String,
    enum: ["To Do", "Doing", "Done"],
    default: "To Do"
  },
  start_date: {
    type: Date
  },
  end_date: {
    type: Date
  },
  tags: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    default: ""
  }
}, {
  timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
  collection: "features",
});

module.exports = mongoose.model("Feature", featureSchema);
