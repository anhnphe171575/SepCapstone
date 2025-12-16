const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    function_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Function", // task thuộc về function nào (optional)
      required: false,
    },
    assigner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // người giao task
      required: true,
    },
    assignee_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // người được giao task
      required: true,
    },
    start_date: {
      type: Date,
    },
    deadline: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    status: {
      type: String,
      enum: ["To Do", "Doing", "Done","Cancelled"],
      default: "To Do",
      required: true,
    },  
    description: {
      type: String,
      trim: true,
    },
    estimate: { type: Number, default: 0 }, // Estimated hours
    actual: { type: Number, default: 0 },     
    reminder_date: { type: Date, default: null },
    reminder_sent: { type: Boolean, default: false },
    auto_update_status: { type: Boolean, default: true },
  },
  {
    timestamps: { createdAt: "createAt", updatedAt: "updateAt" },
    collection: "tasks",
  }
);

module.exports = mongoose.model("Task", taskSchema);